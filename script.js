/**
 * ========================================================
 * 바이브 카페 주문서 자바스크립트 (script.js)
 * ========================================================
 * 이 스크립트는 다음 기능을 제공합니다:
 * 1. Supabase v2 클라이언트 연동 및 orders 테이블 데이터 저장
 * 2. 실시간 예상 주문 금액 자동 계산 (calculateTotal)
 * 3. 음료/사이즈/옵션/수량 변경 시 즉시 반영
 * 4. 딸기 스무디 선택 시 옵션 제한 처리
 * 5. 주문하기 버튼 클릭 시 유효성 검사 및 중복 클릭 방지 (버튼 비활성화)
 * 6. 주문 저장 성공 시 확인 메시지 출력 / 실패 시 알림 및 콘솔 에러 출력
 * 7. 주문 내역 배열(orders) 관리 및 동적 렌더링 (renderOrders)
 * 8. 탭 메뉴 전환 (주문하기 ↔ 주문 내역)
 * 9. 다시 작성 버튼 클릭 시 주문서 폼 초기화 (주문 내역은 보존)
 */

// ========================================================
// Supabase 설정 상수
// ========================================================
// 아래 두 상수에 본인의 Supabase Project URL과 Anon Key를 직접 입력하세요.
const SUPABASE_URL = 'https://bwnxftezgxxdzukvqzmc.supabase.co';       // 예: 'https://xyzcompany.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bnhmdGV6Z3h4ZHp1a3Zxem1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjkzODMsImV4cCI6MjEwNjIwNTM4M30.TjejVhgHNfwpU-ObGI84bf3GoJ4-89m9W0laOOofd_I';   // 예: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// Supabase 클라이언트 초기화 (클라이언트 변수 이름: supabaseClient)
// CDN을 통해 불러온 supabase-js 라이브러리의 createClient 함수를 호출합니다.
const supabaseClient = (typeof supabase !== 'undefined' && supabase.createClient)
  ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : (typeof window !== 'undefined' && window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;


// HTML 문서 구조가 완전히 로드된 후 스크립트를 안전하게 실행합니다.
document.addEventListener('DOMContentLoaded', () => {

  // --------------------------------------------------------
  // 1. 주문 내역 데이터 저장소
  // --------------------------------------------------------
  // 접수된 주문 객체들을 보관하는 배열입니다.
  let orders = [];

  // 주문마다 고유한 일련번호(#1, #2, ...)를 부여하기 위한 카운터 변수
  let currentOrderNumber = 1;


  // --------------------------------------------------------
  // 2. HTML 요소(DOM) 가져오기
  // --------------------------------------------------------
  // 탭 관련 요소
  const tabOrderBtn = document.getElementById('tab-order-btn');             // 주문하기 탭 버튼
  const tabHistoryBtn = document.getElementById('tab-history-btn');         // 주문 내역 탭 버튼
  const orderTabPanel = document.getElementById('order-tab-panel');         // 주문하기 탭 본문 영역
  const historyTabPanel = document.getElementById('history-tab-panel');     // 주문 내역 탭 본문 영역
  const orderCountBadge = document.getElementById('order-count-badge');     // 탭 옆 주문 건수 배지

  // 주문서 폼 관련 요소
  const orderForm = document.getElementById('order-form');                     // 주문서 폼 전체
  const customerNameInput = document.getElementById('customer-name');         // 주문자 이름 입력창
  const customerPhoneInput = document.getElementById('customer-phone');       // 전화번호 입력창
  const beverageSelect = document.getElementById('beverage-select');           // 음료 선택 셀렉트박스
  const sizeRadios = document.querySelectorAll('input[name="size"]');         // 사이즈 라디오 버튼들 (S, M, L)
  const optionCheckboxes = document.querySelectorAll('input[name="option"]'); // 추가 옵션 체크박스들
  const quantityInput = document.getElementById('order-quantity');             // 수량 입력창
  const requestsTextarea = document.getElementById('order-requests');         // 요청사항 입력창
  const totalPriceSpan = document.getElementById('total-price');               // 금액 숫자가 들어갈 <span>
  const submitButton = document.getElementById('submit-button');               // 주문하기 버튼
  const orderConfirmation = document.getElementById('order-confirmation');     // 주문 접수 안내 메시지 영역
  const sizeSection = document.getElementById('size-section');                 // 사이즈 필드셋 영역
  const optionsSection = document.getElementById('options-section');           // 옵션 필드셋 영역

  // 주문 내역 목록 관련 요소
  const ordersList = document.getElementById('orders-list');                   // 주문 카드들이 들어갈 컨테이너
  const ordersSummaryArea = document.getElementById('orders-summary-area');   // 하단 총 금액 및 삭제 버튼 영역
  const ordersTotalSummary = document.getElementById('orders-total-summary'); // "총 주문 금액: 0원 (0건)" 텍스트
  const clearOrdersBtn = document.getElementById('clear-orders-btn');         // "내역 모두 지우기" 버튼


  // --------------------------------------------------------
  // 3. 탭 전환 기능
  // --------------------------------------------------------
  /**
   * 원하는 탭(주문하기 또는 주문 내역)을 활성화하고 화면을 전환합니다.
   * @param {string} targetTab - 'order' 또는 'history'
   */
  function switchTab(targetTab) {
    if (targetTab === 'order') {
      tabOrderBtn.classList.add('active');
      tabHistoryBtn.classList.remove('active');
      orderTabPanel.classList.remove('hidden');
      historyTabPanel.classList.add('hidden');
    } else if (targetTab === 'history') {
      tabHistoryBtn.classList.add('active');
      tabOrderBtn.classList.remove('active');
      historyTabPanel.classList.remove('hidden');
      orderTabPanel.classList.add('hidden');
      renderOrders();
    }
  }

  // 탭 버튼 클릭 이벤트 연결
  tabOrderBtn.addEventListener('click', () => switchTab('order'));
  tabHistoryBtn.addEventListener('click', () => switchTab('history'));


  // --------------------------------------------------------
  // 4. 예상 금액 계산 함수 (calculateTotal)
  // --------------------------------------------------------
  /**
   * 사용자가 고른 음료, 사이즈, 추가 옵션, 수량을 바탕으로
   * 총 금액을 계산하여 화면에 표시하는 함수입니다.
   * @returns {number} 최종 계산된 총 금액
   */
  function calculateTotal() {
    const selectedBeverageOption = beverageSelect.options[beverageSelect.selectedIndex];

    // 음료를 아직 고르지 않은 경우 -> 예상 금액을 0원으로 설정
    if (!beverageSelect.value) {
      totalPriceSpan.textContent = '0원';
      return 0;
    }

    // 음료 기본 가격 (data-price 속성 값)
    const beveragePrice = Number(selectedBeverageOption.dataset.price) || 0;

    // 딸기 스무디 여부 확인 (딸기 스무디는 사이즈/추가옵션 없이 수량만 계산)
    const isNoOptionsBeverage = selectedBeverageOption.dataset.noOptions === 'true';

    // 사이즈 추가 금액
    let sizePrice = 0;
    if (!isNoOptionsBeverage) {
      const checkedSizeRadio = document.querySelector('input[name="size"]:checked');
      if (checkedSizeRadio) {
        sizePrice = Number(checkedSizeRadio.dataset.price) || 0;
      }
    }

    // 추가 옵션 금액
    let optionPrice = 0;
    if (!isNoOptionsBeverage) {
      optionCheckboxes.forEach((checkbox) => {
        if (checkbox.checked) {
          optionPrice += Number(checkbox.dataset.price) || 0;
        }
      });
    }

    // 수량 가져오기 (최소 1, 최대 10)
    let quantity = parseInt(quantityInput.value, 10);
    if (isNaN(quantity) || quantity < 1) {
      quantity = 1;
    } else if (quantity > 10) {
      quantity = 10;
    }

    // 1잔당 금액 및 총 결제 금액 계산
    const unitPrice = beveragePrice + sizePrice + optionPrice;
    const finalTotal = unitPrice * quantity;

    // 천 단위 콤마(toLocaleString) 표시
    totalPriceSpan.textContent = `${finalTotal.toLocaleString()}원`;

    return finalTotal;
  }


  // --------------------------------------------------------
  // 5. 음료 변경에 따른 옵션 활성화/비활성화 처리
  // --------------------------------------------------------
  function handleBeverageChange() {
    const selectedOption = beverageSelect.options[beverageSelect.selectedIndex];
    const isNoOptionsBeverage = selectedOption.dataset.noOptions === 'true';

    // 딸기 스무디일 때는 사이즈/옵션 비활성화
    sizeRadios.forEach((radio) => {
      radio.disabled = isNoOptionsBeverage;
    });

    optionCheckboxes.forEach((checkbox) => {
      checkbox.disabled = isNoOptionsBeverage;
    });

    if (sizeSection) {
      sizeSection.style.opacity = isNoOptionsBeverage ? '0.5' : '1';
    }
    if (optionsSection) {
      optionsSection.style.opacity = isNoOptionsBeverage ? '0.5' : '1';
    }

    calculateTotal();
  }


  // --------------------------------------------------------
  // 6. 입력 요소들에 이벤트 리스너 등록 (실시간 금액 반영)
  // --------------------------------------------------------
  beverageSelect.addEventListener('change', handleBeverageChange);

  sizeRadios.forEach((radio) => {
    radio.addEventListener('change', calculateTotal);
  });

  optionCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', calculateTotal);
  });

  quantityInput.addEventListener('input', calculateTotal);
  quantityInput.addEventListener('change', calculateTotal);


  // --------------------------------------------------------
  // 7. 주문 내역 목록 화면 렌더링 함수 (renderOrders)
  // --------------------------------------------------------
  /**
   * orders 배열의 데이터를 화면에 카드 형태로 표시합니다.
   * [보안] innerHTML 대신 textContent를 사용하여 XSS 취약점을 방지합니다.
   */
  function renderOrders() {
    ordersList.textContent = '';

    // 주문 내역이 없을 때
    if (orders.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'empty-orders-msg';
      emptyMessage.textContent = '아직 주문 내역이 없어요 ☕';
      ordersList.appendChild(emptyMessage);
      ordersSummaryArea.classList.add('hidden');
      return;
    }

    // 주문 내역이 있을 때 요약 영역 표시
    ordersSummaryArea.classList.remove('hidden');

    const grandTotal = orders.reduce((sum, item) => sum + item.totalAmount, 0);
    ordersTotalSummary.textContent = `총 주문 금액: ${grandTotal.toLocaleString()}원 (${orders.length}건)`;

    // 각 주문 카드 생성 (최신순 렌더링)
    orders.forEach((order) => {
      const card = document.createElement('div');
      card.className = 'order-card';

      // 1줄: "#1 홍길동님 · 5,000원"
      const headerLine = document.createElement('div');
      headerLine.className = 'order-card-header';
      headerLine.textContent = `#${order.orderNumber} ${order.customerName}님 · ${order.totalAmount.toLocaleString()}원`;

      // 2줄: 음료, 사이즈, 옵션, 수량
      const detailLine = document.createElement('div');
      detailLine.className = 'order-card-detail';
      if (order.isNoOptions) {
        detailLine.textContent = `${order.beverageName} ${order.quantity}잔`;
      } else {
        const optionPart = order.optionsText ? `${order.optionsText} ` : '';
        detailLine.textContent = `${order.beverageName} ${order.sizeText} ${optionPart}${order.quantity}잔`.replace(/\s+/g, ' ').trim();
      }

      // 3줄: 요청사항 및 주문 시간
      const footerLine = document.createElement('div');
      footerLine.className = 'order-card-footer';
      if (order.requests) {
        footerLine.textContent = `${order.requests} · ${order.orderTime}`;
      } else {
        footerLine.textContent = order.orderTime;
      }

      // 카드 오른쪽 위 취소 버튼
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'order-cancel-btn';
      cancelBtn.textContent = '취소';

      cancelBtn.addEventListener('click', () => {
        const isConfirmed = confirm(`#${order.orderNumber} ${order.customerName}님의 주문을 취소하시겠습니까?`);
        if (isConfirmed) {
          orders = orders.filter((item) => item.orderNumber !== order.orderNumber);
          orderCountBadge.textContent = orders.length;
          renderOrders();
        }
      });

      card.appendChild(cancelBtn);
      card.appendChild(headerLine);
      card.appendChild(detailLine);
      card.appendChild(footerLine);

      ordersList.appendChild(card);
    });
  }


  // --------------------------------------------------------
  // 8. 내역 모두 지우기 버튼 클릭 처리
  // --------------------------------------------------------
  clearOrdersBtn.addEventListener('click', () => {
    if (orders.length === 0) return;

    const isConfirmed = confirm('모든 주문 내역을 삭제하시겠습니까?');
    if (isConfirmed) {
      orders = [];
      orderCountBadge.textContent = '0';
      renderOrders();
    }
  });


  // --------------------------------------------------------
  // 9. 주문하기 버튼 클릭 (Supabase 연동 및 유효성 검사)
  // --------------------------------------------------------
  orderForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // 9-1. 이름 유효성 검사
    const customerName = customerNameInput.value.trim();
    if (!customerName) {
      alert('이름을 입력해주세요');
      customerNameInput.focus();
      return;
    }

    // 9-2. 음료 선택 유효성 검사
    if (!beverageSelect.value) {
      alert('음료를 선택해주세요');
      beverageSelect.focus();
      return;
    }

    // 전화번호 및 요청사항 값 읽기
    const customerPhone = customerPhoneInput ? customerPhoneInput.value.trim() : '';
    const requests = requestsTextarea ? requestsTextarea.value.trim() : '';

    // 9-3. 최신 금액 계산
    const totalAmount = calculateTotal();

    // 9-4. 선택된 음료 정보 추출
    const selectedOption = beverageSelect.options[beverageSelect.selectedIndex];
    const isNoOptionsBeverage = selectedOption.dataset.noOptions === 'true';
    const beverageName = selectedOption.textContent.replace(/\s*\(.*?\)/, '').trim();
    const beveragePrice = Number(selectedOption.dataset.price) || 0; // 음료 단가

    // 수량 확인
    const quantity = parseInt(quantityInput.value, 10) || 1;

    // 사이즈 및 옵션 정보 추출
    let sizeValue = null;
    let sizeText = '';
    let selectedOptionNames = []; // Supabase에 배열 형태로 저장할 옵션 목록

    if (!isNoOptionsBeverage) {
      const checkedSizeRadio = document.querySelector('input[name="size"]:checked');
      if (checkedSizeRadio) {
        sizeValue = checkedSizeRadio.value; // 'S', 'M', 'L'
        sizeText = `${checkedSizeRadio.value}사이즈`;
      }

      // 체크된 추가 옵션 이름들을 배열에 수집
      optionCheckboxes.forEach((checkbox) => {
        if (checkbox.checked) {
          const label = document.querySelector(`label[for="${checkbox.id}"]`);
          if (label) {
            const optionTitle = label.textContent.replace(/\s*\(.*?\)/, '').trim();
            selectedOptionNames.push(optionTitle);
          }
        }
      });
    }

    // 주문 확인 메시지용 옵션 텍스트 (예: "(샷 추가, 크림 추가)")
    const optionsString = selectedOptionNames.length > 0
      ? `(${selectedOptionNames.join(', ')})`
      : '';

    // 상세 내용 문자열 (예: "카페라떼 M사이즈 (샷 추가) 1잔")
    let orderDetailText = '';
    if (isNoOptionsBeverage) {
      orderDetailText = `${beverageName} ${quantity}잔`;
    } else {
      const optionPart = optionsString ? `${optionsString} ` : '';
      orderDetailText = `${beverageName} ${sizeText} ${optionPart}${quantity}잔`.replace(/\s+/g, ' ').trim();
    }

    // 주문 시간 (예: "오후 1:45")
    const now = new Date();
    const orderTime = now.toLocaleTimeString('ko-KR', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // ------------------------------------------------------
    // 9-5. 주문하기 버튼 비활성화 (두 번 눌림 방지)
    // ------------------------------------------------------
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = '주문 처리 중...';

    try {
      // ------------------------------------------------------
      // 9-6. Supabase의 orders 테이블에 주문 저장
      // 저장할 열:
      // customer_name, phone, drink, drink_price, size, options(배열), quantity, request, total_price
      // ------------------------------------------------------
      if (!supabaseClient || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        throw new Error('Supabase URL 또는 Key 설정이 필요합니다. script.js 상단의 SUPABASE_URL과 SUPABASE_KEY를 확인해주세요.');
      }

      const { data, error } = await supabaseClient
        .from('orders')
        .insert([
          {
            customer_name: customerName,
            phone: customerPhone || null,
            drink: beverageName,
            drink_price: beveragePrice,
            size: sizeValue,
            options: selectedOptionNames, // 배열 형태
            quantity: quantity,
            request: requests || null,
            total_price: totalAmount
          }
        ]);

      // Supabase 에러 발생 시 예외 발생
      if (error) {
        throw error;
      }

      // ------------------------------------------------------
      // 9-7. [성공] 로컬 목록 추가 및 주문 확인 메시지 표시
      // ------------------------------------------------------
      const newOrder = {
        orderNumber: currentOrderNumber++,
        customerName: customerName,
        beverageName: beverageName,
        sizeText: sizeText,
        optionsText: optionsString,
        quantity: quantity,
        requests: requests,
        totalAmount: totalAmount,
        orderTime: orderTime,
        isNoOptions: isNoOptionsBeverage
      };

      // 최신 주문을 배열 맨 앞에 추가
      orders.unshift(newOrder);

      // 탭 옆 주문 건수 배지 갱신
      orderCountBadge.textContent = orders.length;

      // 기존 주문 확인 메시지 표시
      const resultMessage = `${customerName}님, ${orderDetailText}, 총 ${totalAmount.toLocaleString()}원 주문이 접수되었습니다!`;
      orderConfirmation.textContent = resultMessage;
      orderConfirmation.hidden = false;
      orderConfirmation.classList.remove('hidden');

      // 주문 확인 메시지로 부드럽게 스크롤
      orderConfirmation.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
      // ------------------------------------------------------
      // 9-8. [실패] 에러 콘솔 출력 및 사용자 알림
      // ------------------------------------------------------
      console.error('주문 저장 실패 상세 원인:', err);
      const errorMsg = err.message ? `\n(원인: ${err.message})` : '';
      alert(`주문 저장에 실패했어요.${errorMsg}`);

    } finally {
      // ------------------------------------------------------
      // 9-9. 저장이 끝나면 버튼 다시 활성화
      // ------------------------------------------------------
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  });


  // --------------------------------------------------------
  // 10. 다시 작성 버튼 클릭 (주문서 폼만 초기화, 주문 내역은 보존)
  // --------------------------------------------------------
  orderForm.addEventListener('reset', () => {
    setTimeout(() => {
      // M 사이즈 복원
      const defaultSizeRadio = document.getElementById('size-m');
      if (defaultSizeRadio) {
        defaultSizeRadio.checked = true;
      }

      // 수량 1 복원
      quantityInput.value = 1;

      // 비활성화되었을 수 있는 사이즈/옵션 요소 복원
      sizeRadios.forEach((radio) => {
        radio.disabled = false;
      });
      optionCheckboxes.forEach((checkbox) => {
        checkbox.disabled = false;
      });
      if (sizeSection) sizeSection.style.opacity = '1';
      if (optionsSection) optionsSection.style.opacity = '1';

      // 금액 0원으로 재계산
      calculateTotal();

      // 주문 확인 메시지만 숨김 처리
      orderConfirmation.textContent = '';
      orderConfirmation.hidden = true;
      orderConfirmation.classList.add('hidden');
    }, 0);
  });


  // --------------------------------------------------------
  // 11. 초기 상태 실행
  // --------------------------------------------------------
  calculateTotal(); // 금액 0원 초기 표시
  renderOrders();   // 초기 빈 주문 내역 안내 메시지 설정
});
