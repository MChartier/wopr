export type Player = 'X' | 'O'
export type Cell = Player | null
export type Board = Cell[]

const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

function findWinningMove(board: Board, player: Player): number | null {
  for (const [a, b, c] of WIN_LINES) {
    const line = [board[a], board[b], board[c]]
    const countPlayer = line.filter((v) => v === player).length
    const countEmpty = line.filter((v) => v === null).length
    if (countPlayer === 2 && countEmpty === 1) {
      if (board[a] === null) return a
      if (board[b] === null) return b
      if (board[c] === null) return c
    }
  }
  return null
}

export function chooseMove(board: Board, player: Player): number | null {
  // 1) If can win now, do it
  const winNow = findWinningMove(board, player)
  if (winNow != null) return winNow

  // 2) Block opponent if they can win next
  const opponent: Player = player === 'X' ? 'O' : 'X'
  const block = findWinningMove(board, opponent)
  if (block != null) return block

  // 3) Pick center, then corners, then sides
  const center = 4
  if (board[center] === null) return center

  const corners = [0, 2, 6, 8]
  for (const idx of corners) if (board[idx] === null) return idx

  const sides = [1, 3, 5, 7]
  for (const idx of sides) if (board[idx] === null) return idx

  return null
}


