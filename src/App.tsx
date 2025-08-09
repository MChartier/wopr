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
  const [awaitingReplayChoice, setAwaitingReplayChoice] = useState<boolean>(false)
  const [gamesPlayed, setGamesPlayed] = useState<number>(0)
  const [sessionEnded, setSessionEnded] = useState<boolean>(false)
  const [phase, setPhase] = useState<'connect' | 'game' | 'terminated'>('connect')
  const [typedText, setTypedText] = useState<string>('')
  const [showIntroOptions, setShowIntroOptions] = useState<boolean>(false)
  const [isWiping, setIsWiping] = useState<boolean>(false)
  const [pendingIntroMessage, setPendingIntroMessage] = useState<boolean>(false)
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

  function startNewGame(deferIntroMessage?: boolean) {
    setBoard(Array(9).fill(null))
    setCurrent('X')
    if (deferIntroMessage) {
      setMessages([])
    } else {
      setMessages(["Let's play a nice game of tic-tac-toe. Your move, human."])
    }
    endgameAnnouncedRef.current = false
    setAwaitingReplayChoice(false)
    setSessionEnded(false)
  }

  // Initialize once (guarded for StrictMode double effect runs)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    // Do not start game immediately; show connection intro first
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Connection intro: type out the greeting, then show options
  useEffect(() => {
    if (phase !== 'connect') return
    const full = 'Would you like to play a game?'
    setTypedText('')
    setShowIntroOptions(false)
    let cancelled = false
    let idx = 0
    const interval = setInterval(() => {
      if (cancelled) return
      idx += 1
      setTypedText(full.slice(0, idx))
      if (idx >= full.length) {
        clearInterval(interval)
        setTimeout(() => {
          if (!cancelled) setShowIntroOptions(true)
        }, 1000)
      }
    }, 50)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [phase])

  // Trigger AI move when it's AI's turn (only during gameplay phase)
  useEffect(() => {
    if (phase !== 'game' || gameOver || current !== 'O') return
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
  }, [board, current, gameOver, phase])

  // Endgame commentary (only during gameplay phase)
  useEffect(() => {
    if (phase !== 'game') return
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
      enqueueMessage('Would you like to play another game?')
      setAwaitingReplayChoice(true)
      setGamesPlayed((n) => n + 1)
      setIsThinking(false)
    })()
  }, [gameOver, winner, draw, phase])

  if (phase !== 'game') {
    return (
      <div className="intro-screen">
        <div className="intro-center">
          <div className="intro-line crt-text">
            <span className="prompt">{'>'}</span> {typedText}
            {phase === 'connect' && typedText && typedText.length < 'Would you like to play a game?'.length ? (
              <span className="console-cursor" aria-hidden="true">_</span>
            ) : null}
          </div>
          {phase === 'connect' && showIntroOptions && (
            <div className="intro-buttons" role="group" aria-label="Connect?">
              <button
                className="crt-text"
                onClick={() => {
                  setIsWiping(true)
                  setPhase('game')
                  startNewGame(true)
                  setPendingIntroMessage(true)
                }}
              >
                Y
              </button>
              <button
                className="crt-text"
                onClick={() => {
                  setShowIntroOptions(false)
                  setTypedText('CONNECTION TERMINATED')
                  setPhase('terminated')
                }}
              >
                N
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {isWiping && (
        <div
          className="wipe-overlay"
          aria-hidden="true"
          onAnimationEnd={() => {
            if (pendingIntroMessage) {
              enqueueMessage("Let's play a nice game of tic-tac-toe. Your move, human.")
              setPendingIntroMessage(false)
            }
            setIsWiping(false)
          }}
        />
      )}
      <h1 className="crt-text">W.O.P.R.</h1>
      <p className="subtitle crt-text">Web-based Online Play Reciprocator</p>

      <div className="board">
        {board.map((cell, idx) => (
          <button
            key={idx}
            className="cell crt-text"
            data-value={cell ?? ''}
            onClick={() => handleClick(idx)}
            disabled={Boolean(cell) || gameOver || current === 'O' || isWiping}
            aria-label={`Cell ${idx + 1}`}
          >
            {cell}
          </button>
        ))}
      </div>

      <div className="status crt-text" role="status" aria-live="polite">
        {sessionEnded ? (
          <span>Games Played: {gamesPlayed}</span>
        ) : (
          <>
            {winner && <span>Winner: {winner}</span>}
            {!winner && draw && <span>Draw</span>}
            {!gameOver && <span>Next: {current}</span>}
          </>
        )}
      </div>

      <section className="console" aria-label="WOPR console output">
        <header className="console-header">WOPR</header>
        <div className="console-screen" ref={consoleRef}>
          {messages.map((m, i) => (
            <div key={i} className="console-line crt-text">
              <span className="prompt">{'>'}</span> {m}
            </div>
          ))}
          <div className="console-cursorline">
            <span className="prompt">{'>'}</span>{' '}
            {isThinking ? (
              <span className="console-thinking">WOPR is thinking…</span>
            ) : awaitingReplayChoice ? (
              <span className="console-options" role="group" aria-label="Play another game?">
                <button
                  onClick={() => {
                    setAwaitingReplayChoice(false)
                    startNewGame()
                  }}
                >
                  Y
                </button>{' '}
                <button
                  onClick={() => {
                    enqueueMessage('A strange game. The only winning move is not to play.')
                    setAwaitingReplayChoice(false)
                    setSessionEnded(true)
                  }}
                >
                  N
                </button>
              </span>
            ) : (
              <span className="console-cursor" aria-hidden="true">_</span>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
