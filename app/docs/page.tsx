export default function DocsPage() {
  return (
    <section className="section">
      <h1>Docs</h1>
      <p>입력값, 옵션, C/T결과 해석 방법을 정리합니다. </p>

      <h2>1) 입력값(Input data)</h2>
      <h3>필수 입력(미입력 시 Calculate 불가)</h3>
      <ul>
        <li>
          <strong>Weight (g/1cav)</strong>: 1 cavity 기준 제품 중량
        </li>
        <li>
          <strong>Clamp force (ton)</strong>
        </li>
        <li>
          <strong>Thickness (mm)</strong>: 제품 평균 두께
        </li>
        <li>
          <strong>Height (mm)</strong>: Ejecting 방향의 제품 높이
        </li>
      </ul>

      <h3>선택 입력 </h3>
      <ul>
        <li>Mold type / Resin / Grade</li>
        <li>Cavity</li>
        <li>Plate type (2P / 3P / HOT)</li>
        <li>Robot ON/OFF</li>
      </ul>

      <h2>2) 옵션(Options)</h2>
      <ul>
        <li>
          <strong>Clamp control</strong>: 기본값은 <code>Logic valve</code>
        </li>
        <li>
          <strong>Open/Close speed</strong>: Low / Mid / Base
        </li>
        <li>
          <strong>Ejecting speed</strong>: Low / Base
        </li>
        <li>
          <strong>Safety factor (%)</strong>: 기본 10% (사용자 수정 가능)
        </li>
      </ul>

      <h3>Plate type이 HOT일 때</h3>
      <ul>
        <li>
          <strong>Sprue Length = 0</strong>으로 고정되며 수정할 수 없습니다.
        </li>
      </ul>

      <h2>3) 계산 결과(Output)</h2>
      <ul>
        <li>각 Stage(FILL ~ CLOSE)의 계산 결과를 보여줍니다.</li>
        <li>Total은 각 Stage의 합입니다.</li>
      </ul>

      <h3>Safety factor 적용 </h3>
      <ul>
        <li>Safety factor는 FILL, PACK, COOL, OPEN, EJECT, CLOSE에 가산 적용됩니다.</li>
        <li>
          <strong>ROBOT에는 safety factor가 적용되지 않습니다.</strong>
        </li>
        <li>Total은 safety factor가 반영된 stage 값들의 합입니다.</li>
      </ul>

      <h2>4) Debug</h2>
      <p>Debug에서 중간값을 비교할 수 있습니다.</p>

      <h3>Fill_Pack 중간값</h3>
      <ul>
        <li>Weighting Distance </li>
        <li>Injection Rate </li>
        <li>Ram Volume </li>
        <li>All Cav. Weight </li>
        <li>Runner Weight </li>
        <li>Total Weight </li>
        <li>ALL Volume </li>
      </ul>
    </section>
  );
}
