// Shared island content and local patrol points. Every island has its own nav grid.
export const ISLANDS = [
  {
    id: 'tennis', label: '테니스 섬', english: 'THE TENNIS ISLAND', number: '01', accent: '#98b68b',
    title: '초록 코트 위에서,<br>가볍게 한 게임.',
    description: '네트 너머로 오가는 노란 공.<br>테니스곰 둘이 신나게 랠리 중이에요.',
    noDog: true,
    playLabel: '공놀이',
    spawn: { x: 0, z: 5.7 },
    stops: [{ x: 0, z: 5.7 }, { x: -1.5, z: 3 }, { x: 1, z: -3 }, { x: 4.8, z: .8 }, { x: -4.8, z: -.8 }],
  },
  {
    id: 'pool', label: '수영 섬', english: 'THE SWIMMING ISLAND', number: '02', accent: '#86bdc4',
    title: '푸른 물결 곁에서,<br>잠깐의 여유.',
    description: '파란 타일과 투명하게 일렁이는 물결.<br>수영곰을 수영장에도, 물방울 떨어지는 노트북에도 던져 보세요.',
    noDog: true,
    playLabel: '수영해',
    spawn: { x: 0, z: 11.6 },
    stops: [{ x: 0, z: 11.6 }, { x: -6.2, z: 10.2 }, { x: -6.2, z: 13.8 }, { x: -2.2, z: 13.9 }, { x: 2.2, z: 10.3 }, { x: 6.8, z: 13.9 }],
  },
  {
    id: 'climb', label: '클라이밍 섬', english: 'THE CLIMBING ISLAND', number: '03', accent: '#d7aa87',
    title: '한 걸음 더 높이,<br>나만의 작은 도전.',
    description: '홀드를 하나씩 잡고 벽 꼭대기까지.<br>클라이밍곰들의 귀여운 볼더링 도전.',
    noDog: true,
    playLabel: '폴짝!',
    spawn: { x: 0, z: 4.9 },
    stops: [{ x: 0, z: 4.9 }, { x: 2.7, z: 2.5 }, { x: -2.7, z: 2.5 }, { x: -4.9, z: -2.5 }, { x: 4.9, z: -2.5 }, { x: 0, z: -4.4 }],
  },
];
