# 홍짱 타로 덱 만들기

## 폴더 구조

```
tarot/
├─ cards.json              ← 78장 공통 목록 (카드 ID·분류). ID는 절대 바꾸지 않아요.
├─ registry.json           ← 어떤 덱이 있는지, 새 리딩에 쓰는 덱(active), 검증 통과 기록(verified)
├─ validate.js             ← 검증 명령
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

## 카드 데이터 예시 (`deck.json` 안)

```json
"major-17": {
  "name": "별",
  "front": "images/v1/major-17.png",
  "alt": "밤하늘 아래 방울이가 물병으로 별빛을 받는 모습",
  "element": null,
  "keywords": ["희망", "회복", "작은 빛"],
  "story": "어두운 하늘에도 별 하나는 빛나요.",
  "storyReversed": "별빛이 잠시 가려져도 사라진 건 아니에요.",
  "upright": "카드의 정방향 뜻을 두세 문장으로 적어요.",
  "reversed": "카드의 역방향 뜻을 두세 문장으로 적어요.",
  "question": "요즘 내 마음을 조금 밝게 해준 일은 무엇인가요?"
}
```

| 항목 | 뜻 | 꼭 필요? |
|---|---|---|
| `name` | 화면에 보이는 카드 이름 | ✅ |
| `front` | 앞면 그림 경로 (deck.json 이 있는 폴더 기준) | 홍짱 덱은 ✅ |
| `alt` | 그림을 글로 설명 (화면 읽기 프로그램용) | 그림이 있으면 ✅ |
| `keywords` | 핵심어 | ✅ |
| `story` | 카드를 뒤집으면 먼저 보이는 한 문장 | ✅ |
| `storyReversed` | 역방향일 때의 한 문장 | 없으면 `reversed`를 써요 |
| `upright`, `reversed` | 정방향·역방향 풀이 | ✅ |
| `question` | 생각해 볼 질문 | ✅ |
| `element` | 오행 (`"목"·"화"·"토"·"금"·"수"`), 정하지 않았으면 `null` = 미정 | 선택 |

덱 맨 위에는 `deckId`, `version`, `status`(`draft` 작업 중 / `published` 공개 / `dev` 개발용), `back`(뒷면 경로), `rights`(사용 권리)가 있어요.

## 별 한 장으로 해 보는 순서

1. **별 그림 넣기**: 그림을 `decks/hongjjang-ohaeng/images/v1/major-17.png`로 저장해요.
2. **카드 데이터 고치기**: `decks/hongjjang-ohaeng/deck.json`의 `"major-17"`에서 `front`를 `"images/v1/major-17.png"`로 바꾸고, `alt`와 해설을 적어요. 버전(`version`)도 올려요. 예) `"1.0.0"`
3. **미리 보기**: `http://localhost:8000/?tarotdev=1#tarot` → 개발용 미리보기에서 덱 `홍짱 오행 타로`, 카드 `major-17`을 골라요. 아직 없는 카드는 **기본 카드 임시 표시**로 보여요.
4. **검증하기**:
   ```bash
   node tarot/validate.js hongjjang-ohaeng
   ```
   고칠 곳이 `❌ [major-17] front: 앞면 그림 파일이 없어요 → …`처럼 카드 ID와 항목으로 나와요.
5. **완성 덱 켜기**: 78장을 모두 채워 `❌`가 없어지면 `deck.json`의 `"status"`를 `"published"`로 바꾸고 실행해요.
   ```bash
   node tarot/validate.js hongjjang-ohaeng --activate
   ```
   검증을 통과해야만 `registry.json`이 바뀌고, 새로 뽑는 카드부터 홍짱 덱으로 나와요.

## 꼭 지켜 주세요

- **예전 그림 폴더는 지우지 않아요.** 그림을 고칠 때는 `images/v2/`처럼 새 폴더를 만들고 `version`을 올려요. 저장된 기록은 뽑았을 때의 그림 경로와 해설을 그대로 갖고 있어서, 예전 폴더가 있어야 예전 기록이 그대로 열려요.
- 버전을 올리면 다시 `--activate`를 해야 해요. 검증하지 않은 새 버전은 앱이 쓰지 않고 기본 덱으로 돌아가요.
- 홍짱이 직접 만들었거나 사용 허락을 받은 그림만 넣어요. `rights`에 적어 두세요.
- 다섯 친구 캐릭터와 카드별 오행은 확정된 것만 적어요. 정하지 않은 오행은 `null`(미정)로 둬요.
- 기본 덱(`basic`)을 고쳤다면 `node tarot/embed.js`도 실행해요. 앱 안 비상용 사본이 맞춰져요.

## 앱에서 하는 일 (코드 구조)

- **추첨**(`TZ_DRAW`): 78장 중에서 중복 없이 뽑아요. 질문은 추첨에 쓰지 않아요. 역방향은 설정에서 켤 때만 나와요.
- **해석**(덱 데이터): 뽑힌 카드 ID로 덱 파일의 이름·그림·해설을 찾아요.
- **기록**: 이 브라우저(localStorage)에만 저장돼요. 카드 ID·순서·방향·덱 ID와 버전·그때의 이름과 해설·그림 경로를 함께 담아요.
