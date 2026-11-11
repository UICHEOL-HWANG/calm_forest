const OPEN = ['자, 오늘의 물건이오. 시작하겠소!'];

export const FALLBACK = {
  auction: {
    moonswing: { intro: ['밤이면 달과 별이 은은하게 빛나는 그네요.'], open: OPEN },
    lanternarch: { intro: ['무대와 같은 종이 등불을 단 마당 문이오.'], open: OPEN },
    starvane: { intro: ['바람이 불면 금빛 별이 빙글 도는 풍향계요.'], open: OPEN },
    _any: {
      raise_npc: ['{who}께서 부르셨소!', '오, {who}! 좋소!', '{who}, 기세가 좋구려!', '{who}께서 한 번 더!'],
      raise_me: ['손님께서 부르셨소!', '좋은 배짱이오!', '오, 손님! 좋소!', '손님 차례가 왔소!'],
      last: ['더 없소?'],
      sold_me: ['손님 것이오! 축하하오!'],
      sold_npc: ['{who}의 것이 되었소!'],
    },
  },
};
