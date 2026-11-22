# 홍짱 사주 앱

사주 만세력, 명리, 타로, 관상, 손금, 풍수, 토정비결, 꿈해몽을 한곳에서 보는 웹앱이에요.
주소: https://hong-jjang.github.io/saju/

## 내 컴퓨터에서 실행하기

타로 덱 파일을 읽으려면 간단한 웹 서버로 열어야 해요. (파일을 두 번 눌러 열어도 앱은 돼요. 다만 그때는 앱에 들어 있는 기본 덱만 써요.)

```bash
cd saju-site
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000/#tarot` 을 열어요.
개발용 미리보기는 `http://localhost:8000/?tarotdev=1#tarot` 이에요.

## 타로 덱 바꾸기

자세한 방법은 [tarot/README.md](tarot/README.md)에 있어요. 짧게 쓰면 이래요.

1. **별 그림 넣기**: `tarot/decks/hongjjang-ohaeng/images/v1/major-17.png`
2. **카드 데이터 고치기**: `tarot/decks/hongjjang-ohaeng/deck.json`의 `"major-17"`
3. **검증하기**: `node tarot/validate.js hongjjang-ohaeng`
4. **완성 덱 켜기**: 78장이 모두 통과하면 `deck.json`의 `status`를 `"published"`로 바꾸고 `node tarot/validate.js hongjjang-ohaeng --activate`

## 파일

| 파일 | 하는 일 |
|---|---|
| `index.html` | 앱 본체 |
| `sw.js`, `manifest.webmanifest`, 아이콘 | 홈 화면 설치, 오프라인 |
| `tarot/` | 타로 카드 목록, 덱(그림·해설), 검증 도구 |
