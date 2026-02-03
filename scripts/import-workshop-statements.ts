import mongoose from 'mongoose'
import dbConnect from '../src/lib/mongodb'
import WikiWorkshopStatement from '../src/models/WikiWorkshopStatement'

type ParsedEntry = {
  issueNumber: number
  date?: string
  speaker: string
  message: string
}

const RAW_SOURCE = `
1호
2022년 11월 2일

남연진(나무)

"난 아직도 내 앞자리 애가 누군지 몰라"
2호
2022년 11월 2일

남연진(나무)

"내 관심영역 밖이어서 아직 날 가르쳐주시는 쌤들 이름도 몰라"
3호
2022년 11월 2일

강한울(설진)

"따뜻한 아이스 아메리카노를 만들기위해서 정수기에 아이스 아메리카노를 부은다음에 온수로 뽑았어!"
4호
2022년 11월 2일

이솔비(므애)

"사실 그 앞자리 바로 내가 모자쓴거였어! 여러분 제가 뒷자리 여학생과 친해지기 위해 이곳으로 왔습니다."
5호
2022년 11월 2일

이솔비(므애)

"알잖아 너 닮아서 나 말 안듣는거"
6호
2022년 11월 15일

정재원(제이)

"we war here together 게임 30분만에 꺤다"
7호
2022년 12월 31일

강한울(설진)

"그렇게 나무는 베어졌다."

이솔비(므애)

"싹둑 - 싹둑 - "
8호
2023년 1월 2일

강한울(설진)

"므애 엄마(윤희열) 짤랐어"
9호
2023년 1월 2일

강한울(설진)

"자라나는 나무에게 거름이 되겠어..."

정진규(청명)

"나무 그게 다 자란거야"

이솔비(므애)

"너네 진짜 아프게 때린다..."
10호
2023년 1월 2일

이솔비(므애)

"한 30cm 발판이면 되겠지(진규가 한울이 키 넘기는게)?"

강한울(설진)

"어? 나무는 안돼!"
11호
2023년 1월 4일

이솔비(므애)

"솔비는 여친있나?"
12호
2023년 1월 5일

정재원(제이)

"오케 그럼 내일 GTA 하는걸로 알고 있을게"

강한울(설진)

"뜨아아아아악"
13호
2023년 1월 13일

정진규(청명)

" (희열이랑) 사별했어요 "
14호
2023년 1월 17일

정진규(청명)

" (나무가) 결국 약을 한거지 "
15호
2023년 2월 19일

이솔비(므애)

" 나무 였던 것 "
16호
2023년 6월 18일

정재원(제이)

" 넌 할 수 있어 재원아... 아냐 넌 못해 병신같은 놈 "
17호
강한울(설진)

" 울산 현대가!!! 멘체스터 시티(정재원)을 꺾습니다!! 얼마나 놀라운 일인가요!! "
18호
강한울(설진)

" 우리집에 므애있다! "
19호
이솔비(므애)

" 너가 말한걸 직접 적길바란다 "
20호
정진규(청명)

" 우리집 나무 결국엔 죽었어. "
21호
이솔비(므애)

" 슈뢰딩거의 역자, 실행하기 전까지 그냥 죽을 수도 있고, 찢어 죽을 수도 있음. "
22호
이솔비(므애)

" 11호는 어떻게 된거임....? "
23호
정진규(청명)

" 마이크선을 뽑아버린다는 걸, 인터넷선을 뽑아버렸네...? "
24호
정진규(청명)

" 어이 강크스 너 정도나 되는 강자가 머리숱은 어디에 두고 온거냐 "
25호
강한울(설진)

" 내가...나무를 베었어...! "
26호
이솔비(므애)

" 벌목을 하시다니, 중범죄입니다. "
27호
강한울(설진)

" 우리집에 솔비있다!!!!!! "

이솔비(므애)

" 나무면 몰라도 내가 왜 있는데!! "
28호
강한울(설진)

" 아니야, 난 너밖...아 이런 대사를 치려던게 아닌데 "
29호
이솔비(므애)

" 이건 도파민이 터진게 아니라 뇌수가 터진것 같아요, 아 아파요 "
30호
강한울(설진)

" 너 밖에 없어 네가 처음이야 "
31호
남연진(나무)

" 응애 가난한 대학생 "
32호
강한울(설진)
이아린(먼지)

" 와 저 불속성 효녀(이솔비) 어떡하냐 진짜 "
33호
강한울(설진)

" 각자 시간을 가지기로 했달까? "

이솔비(므애)

" 뭐야 오자마자 시간을 가진다니 무슨말이야 "
34호
누가 34호 빼고 적음? -개발자-
35호
이솔비(므애)

" 오늘 조리가 덜 된 날것이 자꾸 식탁에 올라와요 "
36호
이솔비(므애)

" 너 뭐가 되는데? "

강한울(설진)

" 나? 네꺼 "
37호
이승찬(돌쇠)

" 한울아?! 비둘기가 물에 닿으면 터져!! "
38호
이승찬(돌쇠)

" 안에서하면 미친놈이지만 밖에서 했으니까 괜찮아 "
39호
이승찬(돌쇠)

" 왜요, 왜 갑자기 룰을 수정해요? "

강한울(설진)

" 내 맘이야 "
40호
정진규(청명)

" 3박 4일간 수면시간 15시간 찍고 술쳐먹기 "
41호
정재원(정)

" 너 나 먼지 태현 누구냐걔 "
42호
박태현(하라)

" 나무 죽었어 ㅠㅠ "
43호
이아린(먼지)

" 연진이 죽었어? 결국 가버렸네... "
44호
강한울(설진)

" 故 남연진씨(2005 ~ 2025)를 기억하며 애도합니다. "
45호
이솔비(므애)

" 다 대가리 망치로 맞았나 제정신이 아니구만 "
46호
남연진(나무)

" 결국 먹은거야? "
47호
이아린(먼지)

" 내꺼를 내 허락도 없이 "
48호
강한울(설진)

" 우와 우리 채팅방 불타요 "
49호
강한울(설진)

" 이 대화가 그냥 먼지랑 그 누구냐 아 그래 나무 "
50호
이승찬(송찬의)

(강한울의 운전면허증을 보며)
" Sex, M? 너 그런 성향이야? "
51호
강한울(설진)

" 와 미친놈, 이건 못참아 오늘의 발언 프로젝트 간다 "
52호
이승찬(송찬의)

" 게임은 죽으면 리겜이 되지만, 면요리가 불어버리면 답이 없다. "
53호

이승찬(송찬의)

" 아, 요즘따라 왜 이렇게 내가 잘생겨보이지? 거울 볼때마다 행복하다. "
54호

강한울(설진)

" 어쩜 진짜 발언 하나하나 주옥같지? "
55호

박태현(하라)

" 이제부터 조신하게 웃어야겠다. "
56호

강한울(설진)

" 승찬이가 지금까지 한 발언들 다 적었으면 5관왕이 뭐냐 그냥 전부분 수상에 고소장까지 추가로 받았을 걸...? "
57호

이솔비(므애)

" 안녕? 나는 고대생이야 고대 대학원생 "

58호

이승찬(송찬의)

" 안녕? 나는 고대생물이야 "
`

const DATE_LINE_REGEX = /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/
const ISSUE_LINE_REGEX = /^(\d{1,3})호$/

function normalizeQuote(line: string) {
  const stripped = line.trim()
  return stripped
    .replace(/^["“”]\s*/, '')
    .replace(/\s*["“”]$/, '')
    .trim()
}

function isQuoteLine(line: string) {
  return /["“”]/.test(line)
}

function isContextLine(line: string) {
  return line.startsWith('(') && line.endsWith(')')
}

function parseDateLine(line?: string) {
  if (!line) return undefined
  const m = line.match(DATE_LINE_REGEX)
  if (!m) return undefined
  const y = Number(m[1])
  const mo = String(Number(m[2])).padStart(2, '0')
  const d = String(Number(m[3])).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

function parseEntriesFromRaw(raw: string): ParsedEntry[] {
  const byIssue = new Map<number, string[]>()
  let currentIssue: number | null = null

  for (const rawLine of raw.split(/\r?\n/g)) {
    const line = rawLine.trim()
    if (!line) continue

    const issueMatch = line.match(ISSUE_LINE_REGEX)
    if (issueMatch) {
      currentIssue = Number(issueMatch[1])
      if (!byIssue.has(currentIssue)) byIssue.set(currentIssue, [])
      continue
    }

    if (currentIssue !== null) {
      byIssue.get(currentIssue)?.push(line)
    }
  }

  const entries: ParsedEntry[] = []

  for (let issueNumber = 1; issueNumber <= 58; issueNumber += 1) {
    const body = byIssue.get(issueNumber) || []

    let date: string | undefined
    if (body.length > 0) {
      const maybeDate = parseDateLine(body[0])
      if (maybeDate) {
        date = maybeDate
      }
    }

    const contentLines = date ? body.slice(1) : body.slice(0)

    const pendingSpeakers: string[] = []
    const speakerSet = new Set<string>()
    const contextLines: string[] = []
    const quotePairs: Array<{ speaker?: string; quote: string }> = []
    let lastSpeaker: string | null = null

    for (const line of contentLines) {
      if (isQuoteLine(line)) {
        const quote = normalizeQuote(line)
        if (!quote) continue

        const speakerLabel: string | null =
          pendingSpeakers.length > 0
            ? pendingSpeakers.join(', ')
            : lastSpeaker

        if (speakerLabel) {
          quotePairs.push({ speaker: speakerLabel, quote })
          speakerSet.add(speakerLabel)
          lastSpeaker = speakerLabel
        } else {
          quotePairs.push({ quote })
        }

        pendingSpeakers.length = 0
        continue
      }

      if (isContextLine(line)) {
        contextLines.push(line)
        continue
      }

      pendingSpeakers.push(line)
      speakerSet.add(line)
      lastSpeaker = line
    }

    let message = ''
    if (quotePairs.length === 1 && speakerSet.size === 1 && contextLines.length === 0) {
      message = quotePairs[0].quote
    } else {
      message = quotePairs
        .map((pair) => (pair.speaker ? `${pair.speaker}: ${pair.quote}` : pair.quote))
        .join(' / ')
    }
    if (!message && pendingSpeakers.length > 0) {
      message = pendingSpeakers.join(' ')
    }
    if (!message) {
      message = '-'
    }

    if (contextLines.length > 0) {
      message = `[상황] ${contextLines.join(' / ')} / ${message}`
    }

    let speaker = Array.from(speakerSet).join(', ')
    if (!speaker) speaker = '미상'

    // 특수 케이스 보정
    if (issueNumber === 34) {
      speaker = '개발자'
      message = '누가 34호 빼고 적음?'
    }

    entries.push({
      issueNumber,
      date,
      speaker,
      message
    })
  }

  return entries
}

async function main() {
  await dbConnect()

  const entries = parseEntriesFromRaw(RAW_SOURCE)
  const issueNumbers = entries.map(entry => entry.issueNumber)

  await (WikiWorkshopStatement as any).deleteMany({
    issueNumber: { $in: issueNumbers }
  })

  const docs = entries.map((entry) => {
    const createdAt = entry.date
      ? new Date(`${entry.date}T00:00:00+09:00`)
      : undefined

    return {
      issueNumber: entry.issueNumber,
      speaker: entry.speaker,
      message: entry.message,
      listAuthor: 'system-import',
      listAuthorDisplayName: 'system-import',
      listAuthorDiscordId: 'system-import',
      ...(createdAt ? { createdAt } : {})
    }
  })

  await (WikiWorkshopStatement as any).insertMany(docs, { ordered: true })

  const count = await (WikiWorkshopStatement as any).countDocuments({
    issueNumber: { $gte: 1, $lte: 58 }
  })

  console.log(`Imported workshop statements: ${count}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
