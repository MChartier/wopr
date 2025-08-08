import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [messages, setMessages] = useState<string[]>([])
  const winner = useMemo(() => getWinner(board), [board])
  const draw = useMemo(() => isDraw(board), [board])
  const gameOver = Boolean(winner) || draw
  const initializedRef = useRef<boolean>(false)
  const endgameAnnouncedRef = useRef<boolean>(false)

  function enqueueMessage(text: string) {
    setMessages((prev) => [...prev, text])
  }

  function handleClick(index: number) {
    if (gameOver || board[index]) return
    const nextBoard = board.slice()
    nextBoard[index] = current
    const nextPlayer: Player = current === 'X' ? 'O' : 'X'
    setBoard(nextBoard)
    setCurrent(nextPlayer)
  }

  function startNewGame() {
    setBoard(Array(9).fill(null))
    setCurrent('X')
    setMessages(["Would you like to play a game?"])
    endgameAnnouncedRef.current = false
  }

  // Initialize once (guarded for StrictMode double effect runs)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    startNewGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    if (gameOver || current !== 'O') return
    const move = chooseMove(board, 'O')
    if (move != null) {
      const next = board.slice()
      next[move] = 'O'
      setBoard(next)
      setCurrent('X')
      enqueueMessage('Processing... Move complete.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, current, gameOver])

  // Endgame commentary
  useEffect(() => {
    if (!gameOver) {
      endgameAnnouncedRef.current = false
      return
    }
    if (endgameAnnouncedRef.current) return
    endgameAnnouncedRef.current = true
    if (winner === 'O') {
      enqueueMessage('Victory assured. Thank you for a stimulating game.')
    } else if (winner === 'X') {
      enqueueMessage('Improbable outcome. You have prevailed this time.')
    } else if (draw) {
      enqueueMessage('A strange game. The only winning move is not to play.')
    }
  }, [gameOver, winner, draw])

  return (
    <div className="container">
      <h1>WOPR</h1>
      <p className="subtitle">A web-based AI-powered tic‑tac‑toe</p>

      <div className="controls">
        <button onClick={startNewGame}>Reset</button>
      </div>

      <div className="playfield">
      <section className="console" aria-label="WOPR console output">
        <header className="console-header">WOPR</header>
        <div className="console-screen">
          {messages.map((m, i) => (
            <div key={i} className="console-line">
              <span className="prompt">{'>'}</span> {m}
            </div>
          ))}
          <div className="console-cursor" aria-hidden="true">_</div>
        </div>
      </section>

      <div className="board">
        {board.map((cell, idx) => (
          <button
            key={idx}
            className="cell"
            data-value={cell ?? ''}
            onClick={() => handleClick(idx)}
            disabled={Boolean(cell) || gameOver || current === 'O'}
            aria-label={`Cell ${idx + 1}`}
          >
            {cell}
          </button>
        ))}
      </div>
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
