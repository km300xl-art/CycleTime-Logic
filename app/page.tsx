import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="section">
      <h1>CycleTime Logic</h1>
      <p>
        CycleTime Logic은 사출 성형 사이클타임을 <strong>FILL, PACK, COOL, OPEN, EJECT, ROBOT, CLOSE</strong> 단계로
        나누어 계산하는 웹 도구입니다.
      </p>

      <ul>
        <li>
          <strong>브라우저에서만 계산</strong>: 입력값은 서버로 저장되지 않습니다.
        </li>
        <li>
          <strong>C/T 로직</strong>: 로직 테이블을 기준으로 계산 규칙을 구현합니다.
        </li>
        <li>
          <strong>디버그 비교 지원</strong>: 중간 계산값 확인용 입니다.
        </li>
      </ul>

      <h2>시작하기</h2>
      <ol>
        <li>
          <Link href="/calculator">Calculator</Link>에서 Input / Options를 입력합니다.
        </li>
        <li>
          <strong>Calculate</strong>를 눌러 결과를 생성합니다.
        </li>
        <li>계산 결과는 참고용이며 실제 설비 및 금형 조건에 따라 차이가 날 수 있습니다.</li>
      </ol>

      <p style={{ marginTop: 16 }}>
        <Link href="/calculator">Go to Calculator →</Link>
      </p>
    </section>
  );
}
