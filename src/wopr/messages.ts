import type { Board, Player } from './ai'
import OpenAI from 'openai'

type Phase = 'move' | 'end'

function renderBoard(board: Board): string {
  const cells = board.map((c) => (c ?? '·')).join('')
  const r1 = cells.slice(0, 3)
  const r2 = cells.slice(3, 6)
  const r3 = cells.slice(6, 9)
  return `${r1}\n${r2}\n${r3}`
}

function fallbackMessage(phase: Phase, opts: { winner?: Player | null; draw?: boolean }): string {
  if (phase === 'end') {
    if (opts.winner === 'O') return 'Victory assured. Thank you for a stimulating game.'
    if (opts.winner === 'X') return 'Improbable outcome. You have prevailed this time.'
    if (opts.draw) return 'A strange game. The only winning move is not to play.'
  }
  return 'Processing... Move complete.'
}

export async function getWoprMessage(
  phase: Phase,
  params: {
    board: Board
    nextPlayer: Player
    winner?: Player | null
    draw?: boolean
    chosenMoveIndex?: number
    lastHumanMoveIndex?: number
    previousMessages?: string[]
  },
): Promise<string> {
  const apiKey = import.meta.env?.VITE_OPENAI_API_KEY as string | undefined
  if (!apiKey) {
    return fallbackMessage(phase, { winner: params.winner, draw: params.draw })
  }

  const system = [
    'You are WOPR, a cold-war era military computer (1983 film WarGames). You are playing tic-tac-toe with a human.',
    'STYLE: One short sentence, terse, dry, analytical, occasionally sardonic. No emojis.',
    'REFERENCING MOVES: Do NOT use coordinates. Use: top-left, top, top-right, left, center, right, bottom-left, bottom, bottom-right.',
    'COHESION: Maintain continuity with your prior lines and build naturally on the conversation so far. Avoid repeating the same phrasing.',
    "TOPIC: Address the human's previous move and briefly motivate your response.",
    'ATTITUDE: Confident but not cocky. You are a computer with nothing to prove. Acknowledge when victory is impossible.',
  ].join(' ')

  const boardAscii = renderBoard(params.board)
  const moveName =
    typeof params.chosenMoveIndex === 'number' ? indexToPositionName(params.chosenMoveIndex) : undefined
  const humanMoveName =
    typeof params.lastHumanMoveIndex === 'number'
      ? indexToPositionName(params.lastHumanMoveIndex)
      : undefined
  const user =
    phase === 'move'
      ? `Board (rows):\n${boardAscii}\nHuman (X) last move: ${humanMoveName ?? 'unknown'}. Your chosen move (O): ${moveName ?? 'unknown'}. Respond with one short sentence, acknowledging the human move and motivating your selected move.`
      : `Board (rows):\n${boardAscii}\nGame over. Winner: ${params.winner ?? (params.draw ? 'Draw' : 'Unknown')}. Respond with one short closing sentence to the human.`

  try {
    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
    const transcript = (params.previousMessages ?? [])
      .slice(-8)
      .map((m) => `WOPR: ${m}`)
      .join('\n')
    const input = [
      `SYSTEM: ${system}`,
      transcript ? `DIALOGUE SO FAR:\n${transcript}` : '',
      `PROMPT:\n${user}`,
    ]
      .filter(Boolean)
      .join('\n\n')

    const response = await client.responses.create({
      model: 'gpt-5-mini',
      reasoning: { effort: 'low' },
      input,
    })
    const text: string | undefined = response.output_text
    return (text ?? '').trim() || fallbackMessage(phase, { winner: params.winner, draw: params.draw })
  } catch {
    return fallbackMessage(phase, { winner: params.winner, draw: params.draw })
  }
}

function indexToPositionName(index: number): string {
  const names = [
    'top-left',
    'top',
    'top-right',
    'left',
    'center',
    'right',
    'bottom-left',
    'bottom',
    'bottom-right',
  ] as const
  return names[index] ?? 'unknown'
}


