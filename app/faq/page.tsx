export default function FaqPage() {
  return (
    <section className="section">
      <h1>FAQ</h1>

      <h2>Q1. 왜 Calculate를 눌러야 결과가 나오나요?</h2>
      <p>
        입력 중 자동 재계산으로 인한 혼선을 방지하기 위해, <strong>Calculate 버튼을 누른 시점의 값</strong>으로만
        결과를 계산합니다. 입력을 변경했다면 다시 Calculate를 눌러 최신 결과로 갱신하세요.
      </p>

      <h2>Q2. 결과가 다르면 어디부터 확인하나요?</h2>
      <ol>
        <li>입력 단위(ton/mm/g)가 맞는지 확인</li>
        <li>Plate type / Speed mode / Clamp control 값 확인</li>
        <li>Debug에서 중간값 비교</li>
      </ol>

      <h2>Q3. Robot ON/OFF는 무엇인가요?</h2>
      <p>
        Robot OFF를 선택하면 <strong>ROBOT 시간은 0으로 강제</strong>되고 Total도 그만큼 감소합니다.
      </p>

      <h2>Q4. Safety factor(%)는 Total에만 더해지나요?</h2>
      <p>
        아니요. Safety factor는 <strong>stage별(FILL, PACK, COOL, OPEN, EJECT, CLOSE)</strong>로 가산되고, Total은 그
        합입니다(ROBOT 제외).
      </p>

      <h2>Q5. 개인정보는 수집하나요?</h2>
      <p>
        회원가입이 없고 입력값은 브라우저에서만 계산됩니다. 다만 AdSense 광고가 사용되는 경우, 쿠키를 포함한 광고
        관련 데이터가 제3자(Google 등)에서 처리될 수 있습니다(Privacy 참고).
      </p>
    </section>
  );
}
