import { useMemo, useState } from 'react'
import './App.css'
import { chooseMove } from './wopr/ai'

type Player = 'X' | 'O'
type Cell = Player | null
type Board = Cell[]

const winningLines: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

function getWinner(board: Board): Player | null {
  for (const [a, b, c] of winningLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }
  return null
}

function isDraw(board: Board): boolean {
  return board.every(Boolean) && !getWinner(board)
}

function App() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null))
  const [current, setCurrent] = useState<Player>('X')
  const [aiEnabled, setAiEnabled] = useState<boolean>(true)
  const winner = useMemo(() => getWinner(board), [board])
  const draw = useMemo(() => isDraw(board), [board])
  const gameOver = Boolean(winner) || draw

  function handleClick(index: number) {
    if (gameOver || board[index]) return
    const nextBoard = board.slice()
    nextBoard[index] = current
    const nextPlayer: Player = current === 'X' ? 'O' : 'X'
    setBoard(nextBoard)
    setCurrent(nextPlayer)
  }

  function handleReset() {
    setBoard(Array(9).fill(null))
    setCurrent('X')
  }

  // Trigger AI move when it's AI's turn
  useMemo(() => {
    if (!aiEnabled || gameOver || current !== 'O') return
    const move = chooseMove(board, 'O')
    if (move != null) {
      const next = board.slice()
      next[move] = 'O'
      setBoard(next)
      setCurrent('X')
    }
  }, [board, current, aiEnabled, gameOver])

  return (
    <div className="container">
      <h1>WOPR</h1>
      <p className="subtitle">A web-based AI-powered tic‑tac‑toe</p>

      <div className="controls">
        <label className="toggle">
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={(e) => setAiEnabled(e.target.checked)}
          />
          Play vs WOPR
        </label>
        <button onClick={handleReset}>Reset</button>
      </div>

      <div className="board">
        {board.map((cell, idx) => (
          <button
            key={idx}
            className="cell"
            onClick={() => handleClick(idx)}
            disabled={Boolean(cell) || gameOver || (aiEnabled && current === 'O')}
            aria-label={`Cell ${idx + 1}`}
          >
            {cell}
          </button>
        ))}
      </div>

      <div className="status" role="status" aria-live="polite">
        {winner && <span>Winner: {winner}</span>}
        {!winner && draw && <span>Draw</span>}
        {!gameOver && <span>Next: {current}</span>}
      </div>

      <footer className="footer">WOPR v0 — Make your move</footer>
    </div>
  )
}

export default App
