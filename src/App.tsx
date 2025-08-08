import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { chooseMove } from './wopr/ai'
import { getWoprMessage } from './wopr/messages'

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
  const [isThinking, setIsThinking] = useState<boolean>(false)
  const winner = useMemo(() => getWinner(board), [board])
  const draw = useMemo(() => isDraw(board), [board])
  const gameOver = Boolean(winner) || draw
  const initializedRef = useRef<boolean>(false)
  const endgameAnnouncedRef = useRef<boolean>(false)
  const lastHumanMoveRef = useRef<number | null>(null)
  const consoleRef = useRef<HTMLDivElement | null>(null)

  function enqueueMessage(text: string) {
    setMessages((prev) => [...prev, text])
    // Defer scroll to next microtask so DOM has rendered the new line
    queueMicrotask(() => {
      const el = consoleRef.current
      if (el) {
        el.scrollTop = el.scrollHeight
      }
    })
  }

  useEffect(() => {
    const el = consoleRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [isThinking])

  function handleClick(index: number) {
    if (gameOver || board[index]) return
    const nextBoard = board.slice()
    nextBoard[index] = current
    const nextPlayer: Player = current === 'X' ? 'O' : 'X'
    setBoard(nextBoard)
    setCurrent(nextPlayer)
    if (current === 'X') {
      lastHumanMoveRef.current = index
    }
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
    let cancelled = false
    ;(async () => {
      setIsThinking(true)
      const move = chooseMove(board, 'O')
      const message = await getWoprMessage('move', {
        board,
        nextPlayer: 'O',
        chosenMoveIndex: move ?? undefined,
        previousMessages: messages,
        lastHumanMoveIndex: lastHumanMoveRef.current ?? undefined,
      })
      if (cancelled) return
      if (move != null) {
        const next = board.slice()
        next[move] = 'O'
        setBoard(next)
        setCurrent('X')
        enqueueMessage(message)
      }
      setIsThinking(false)
    })()
    return () => {
      cancelled = true
      setIsThinking(false)
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
    ;(async () => {
      setIsThinking(true)
      const message = await getWoprMessage('end', {
        board,
        nextPlayer: current,
        winner,
        draw,
        previousMessages: messages,
      })
      enqueueMessage(message)
      setIsThinking(false)
    })()
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
        <div className="console-screen" ref={consoleRef}>
          {messages.map((m, i) => (
            <div key={i} className="console-line">
              <span className="prompt">{'>'}</span> {m}
            </div>
          ))}
          <div className="console-cursorline">
            <span className="prompt">{'>'}</span>{' '}
            {isThinking ? (
              <span className="console-thinking">WOPR is thinking…</span>
            ) : (
              <span className="console-cursor" aria-hidden="true">_</span>
            )}
          </div>
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
