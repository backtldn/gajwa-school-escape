/* The answers and prompts used by the school's 15 clue stations. */
const QUESTIONS = [
  { prompt: "교장선생님 성함은?", answer: "안서현 선생님", kind: "text", clue: "교장 선생님 성함은 안서현 선생님." },
  { prompt: "우리 학교의 교목은?", answer: "소나무", kind: "text", clue: "학교를 상징하는 나무는 소나무." },
  { prompt: "우리 학교의 교화는?", answer: "장미", kind: "text", clue: "학교를 상징하는 꽃은 장미." },
  { prompt: "우리 학교 마스코트 이름은?", answer: "우리, 두리", kind: "mascots", clue: "마스코트는 우리와 두리." },
  { prompt: "학생회 인원은 선생님을 포함하여 몇 명인가?", answer: "10명", kind: "number", value: "10", clue: "선생님을 포함한 학생회 인원은 10명." },
  { prompt: "우리 학교 출신 아이돌은?", answer: "에이티즈 성화", kind: "text", clue: "학교 출신 아이돌은 에이티즈 성화." },
  { prompt: "우리 학교 학생 수는?", answer: "207명", kind: "number", value: "207", clue: "학교 학생 수는 207명." },
  { prompt: "우리 학교 교가에 들어 있는 'ㅇ'의 개수는?", answer: "23개", kind: "number", value: "23", clue: "교가에 들어 있는 'ㅇ'은 23개." },
  { prompt: "우리 학교가 행복나눔학교로 처음 지정된 연도는?", answer: "2022년", kind: "number", value: "2022", clue: "행복나눔학교 첫 지정 연도는 2022년." },
  { prompt: "가좌를 한자로 쓰면?", answer: "加佐", kind: "hanja", hint: "힌트: 더할 가, 도울 좌", clue: "가좌(加佐)는 더할 가, 도울 좌." },
  { prompt: "우리 학교의 학급 수는?", answer: "11학급", kind: "number", value: "11", clue: "학교는 11학급으로 이루어져 있다." },
  { prompt: "우리 학교 남자 선생님과 여자 선생님 수는?", answer: "남자 10명, 여자 32명", kind: "teachers", clue: "남자 선생님 10명, 여자 선생님 32명." },
  { prompt: "우리 학교가 개교한 날은?", answer: "2006년 3월 1일", kind: "date", clue: "학교는 2006년 3월 1일에 개교했다." },
  { prompt: "우리 학교의 2026년 12월 25일 급식은?", answer: "없다", kind: "noMeal", clue: "2026년 12월 25일 급식은 없다." },
  { prompt: "우리 학교 6학년 학생 수는?", answer: "55명", kind: "number", value: "55", clue: "6학년 학생 수는 55명." }
];

function normalizeAnswer(value) {
  return value.toLocaleLowerCase("ko-KR").replace(/[\s.,!?，。！？'’"“”()[\]{}:;·ㆍ_-]/g, "");
}

function isCorrectAnswer(question, input) {
  const answer = normalizeAnswer(input);
  if (!answer) return false;

  switch (question.kind) {
    case "number":
      return (input.match(/\d+/g) || []).includes(question.value);
    case "date":
      return /2006\D*0?3\D*0?1/.test(input);
    case "hanja":
      return answer.includes("加佐");
    case "mascots":
      return answer.includes("우리") && answer.includes("두리");
    case "teachers":
      return /남(?:자|성)?10명?/.test(answer) && /여(?:자|성)?32명?/.test(answer);
    case "noMeal":
      return answer === "없다" || answer === "없음" || answer === "급식없다" || answer === "급식없음";
    default:
      return answer === normalizeAnswer(question.answer);
  }
}
