# 홍짱 타로 덱 만들기

## 폴더 구조

```
tarot/
├─ cards.json              ← 78장 공통 목록 (카드 ID·분류). ID는 절대 바꾸지 않아요.
├─ registry.json           ← 어떤 덱이 있는지, 새 리딩에 쓰는 덱(active), 검증 통과 기록(verified)
├─ validate.js             ← 검증 명령 · 검수표 만들기
├─ reports/                ← 검수표 (validate.js 가 만들어요)
├─ embed.js                ← 기본 덱을 고쳤을 때 앱 안 비상용 사본 맞추기
└─ decks/
   ├─ basic/               ← 기본 덱: 그림 없이 이름·번호만 있는 글자 카드 (지금 쓰는 덱)
   │  ├─ deck.json
   │  └─ back.svg          ← 공통 뒷면 (오행 상생 고리, 180도 돌려도 같은 모양)
   ├─ preview-dev/         ← 개발용 미리보기 덱: 기본 덱을 이어받고 '별'만 임시 그림으로 바꿔요
   │  ├─ deck.json
   │  └─ images/v0.1/major-17-temp.svg
   └─ hongjjang-ohaeng/    ← 정식 '홍짱 오행 타로' (작업 중)
      ├─ deck.json
      └─ images/v0.1/back.svg  (카드 그림은 이 옆에 넣어요)
```

## 카드 ID

- 메이저: `major-00`(바보) ~ `major-21`(세계). 예) 별 = `major-17`
- 마이너: `wands-01`~`wands-14`, `cups-…`, `swords-…`, `pentacles-…`
  - 01 = 에이스, 02~10 = 숫자, 11 = 시종, 12 = 기사, 13 = 여왕, 14 = 왕

덱마다 같은 ID를 써요. 그래서 기본 덱의 `major-17`과 홍짱 덱의 `major-17`은 그림과 해설이 서로 달라도 같은 카드로 다뤄요.

## 카드 데이터 (2판 구조)

전통 해설과 홍짱의 창작 해설을 따로 적어요. 실제 예시는 `tarot/decks/hongjjang-ohaeng/deck.json`의 `"major-17"`이에요.

```json
"major-17": {
  "name": "별",
  "front": "images/v1/major-17.png",
  "alt": "밤하늘 큰 별 아래에서 방울이가 물병 두 개로 물을 붓는 장면",
  "review": "초안",
  "traditional": {
    "keywords": ["희망", "치유", "영감"],
    "upright": "전통 정방향 뜻",
    "reversed": "전통 역방향 뜻",
    "source": "확인 필요"
  },
  "scene": {
    "description": "홍짱이 그린 장면 한두 문장",
    "symbols": [ { "symbol": "큰 별", "meaning": "어둠 속에서도 남아 있는 작은 희망" } ]
  },
  "reading": {
    "author": "홍짱",
    "story": "어두운 하늘에도 별 하나는 빛나요.",
    "storyReversed": "별빛이 잠시 가려져도 사라진 건 아니에요.",
    "question": "요즘 내 마음을 조금 밝게 해준 일은 무엇인가요?",
    "advice": "마음이 밝아졌던 순간을 하나 적어 보세요."
  },
  "positions": {
    "situation": { "upright": "지금의 상황에서 읽는 문장", "reversed": "역방향일 때" },
    "consider":  { "upright": "살펴볼 점에서 읽는 문장", "reversed": "…" },
    "action":    { "upright": "해볼 수 있는 일에서 읽는 문장", "reversed": "…" }
  },
  "element": { "value": "수", "reason": "배정 이유", "usage": "해설에서 쓰는 방법", "review": "초안" }
}
```

| 항목 | 뜻 | 꼭 필요? |
|---|---|---|
| `review` | 카드 검토 상태: `"초안"` → `"검토 중"` → `"승인"` | ✅ |
| `traditional` | 전통 핵심어·정역방향 뜻. `source`에 참고한 책·자료를 적고, 못 찾았으면 `"확인 필요"` | ✅ |
| `scene` | 홍짱이 그린 장면과 그 속 상징·뜻 | 홍짱 덱은 ✅ |
| `reading` | 앱에 보이는 창작 해설: 한 문장, 성찰 질문, 한마디 조언 | ✅ |
| `positions` | 세 장 배열의 자리별 해설. 없으면 앱이 정해진 자리 규칙으로 이어 써요 | 선택 |
| `element` | 오행·배정 이유·쓰임·검토 상태. **`review`가 `"승인"`일 때만** 사용자 풀이에 보여요. 정하지 않았으면 `"value": null` | 선택 |
| `front`, `alt` | 앞면 그림 경로와 그림 설명 | 홍짱 덱은 ✅ |

## 카드 한 장 바꾸기 — '별' 예시 (실제 파일 이름)

1. **그림 넣기**: 새 그림을 `tarot/decks/hongjjang-ohaeng/images/v1/major-17.png`로 저장해요.
   - 지금은 `images/v0.1/major-17.png`(토끼 별, 첫 시안)가 **임시**로 연결돼 있어요. 이 파일은 지우지 마세요.
2. **카드 데이터 고치기**: `tarot/decks/hongjjang-ohaeng/deck.json`을 열어서
   - 맨 위 `"version"`을 올려요. 예) `"0.2.0"` → `"0.3.0"`
   - `"major-17"`의 `"front"`를 `"images/v1/major-17.png"`로 바꾸고 `"alt"`를 적어요.
   - `"temporary": true`와 `"tempNote"` 줄은 지워요.
   - `"scene"`의 장면 설명과 상징을 적고, 해설·자리별 해설을 다듬어요.
3. **나란히 보기**: `http://localhost:8000/?tarotdev=1#tarot`을 열어요.
   - 개발용 미리보기에서 왼쪽 `기본 덱`, 오른쪽 `홍짱 오행 타로`, 카드 `major-17 · 별`을 골라요.
   - 앞면, 뒷면, 자리별 해설, 그림이 잘리는지를 확인해요.
   - "이 카드를 고른 자리에 넣어 세 장 리딩 열기"로 자리마다 어떻게 읽히는지 볼 수 있어요.
4. **검수표 만들기**:
   ```bash
   node tarot/validate.js hongjjang-ohaeng
   ```
   `tarot/reports/hongjjang-ohaeng-검수표.md`에 카드별 표와 "홍짱이 검토할 원고·이미지" 목록이 생겨요.
5. **승인하기**: 마음에 들면 `"review": "승인"`으로 바꿔요. 오행도 확정했다면 `"element"`의 `"review"`도 `"승인"`으로 바꿔요.
6. **승인한 카드만 먼저 바꿔 넣기**:
   ```bash
   node tarot/validate.js hongjjang-ohaeng --overlay
   ```
   기본 덱으로 뽑다가 '별'이 나오면 홍짱 별로 보여요. 나머지 77장은 기본 카드 그대로예요.
7. **78장이 모두 승인되면 덱 전체 켜기**: `deck.json`의 `"status"`를 `"published"`로 바꾸고 실행해요.
   ```bash
   node tarot/validate.js hongjjang-ohaeng --activate
   ```

저장한 기록은 뽑은 그때의 덱 버전·방향·그림 경로·해설·종합 질문을 그대로 갖고 있어요. 그래서 다시 열어도 카드를 다시 뽑지 않아요. 덱을 바꿔도 예전 모습 그대로 열려요.

## 꼭 지켜 주세요

- **예전 그림 폴더는 지우지 않아요.** 그림을 고칠 때는 `images/v2/`처럼 새 폴더를 만들고 `version`을 올려요. 저장된 기록은 뽑았을 때의 그림 경로와 해설을 그대로 갖고 있어서, 예전 폴더가 있어야 예전 기록이 그대로 열려요.
- 버전을 올리면 다시 `--activate`를 해야 해요. 검증하지 않은 새 버전은 앱이 쓰지 않고 기본 덱으로 돌아가요.
- 홍짱이 직접 만들었거나 사용 허락을 받은 그림만 넣어요. `rights`에 적어 두세요.
- 다섯 친구 캐릭터와 카드별 오행은 확정된 것만 적어요. 정하지 않은 오행은 `null`(미정)로 둬요.
- 기본 덱(`basic`)을 고쳤다면 `node tarot/embed.js`도 실행해요. 앱 안 비상용 사본이 맞춰져요.

## 앱에서 하는 일 (코드 구조)

- **추첨**(`TZ_DRAW`): 78장 중에서 중복 없이 뽑아요. 질문은 추첨에 쓰지 않아요. 역방향은 설정에서 켤 때만 나와요.
- **세 장 읽기**: 자리별 해설(없으면 자리 규칙) → 세 장을 이어 읽는 하나의 질문. 정·역방향이 섞이거나 완드·펜타클, 컵·소드가 함께 나오면 두 방향을 함께 보라는 문장을 더해요.
- **오행**: 카드의 `element.review`가 "승인"일 때만 "오행 수"처럼 글자와 색으로 보여 줘요.
- **해석**(덱 데이터): 뽑힌 카드 ID로 덱 파일의 이름·그림·해설을 찾아요.
- **기록**: 이 브라우저(localStorage)에만 저장돼요. 카드 ID·순서·방향·덱 ID와 버전·그때의 이름과 해설·그림 경로를 함께 담아요.
