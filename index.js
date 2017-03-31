export function parse(input) {
	const ast = lex(input)

	if (!ast.length) {
		// lexer failure
		return { err: ast.err }
	}

	const p = new parser(ast)
	const err = p.run()

	if (err) {
		return { err }
	}

	return p.result()
}

class parser {
	constructor(ast) {
		this.ast = ast
		this.pos = 0 // current position in ast
		this.invert = false // hours<>minutes inverted form
		this.hcorrection = 0 // hours are adjusted by this number, used for '15 минут шестого'
		this.err = null // last error
		this.numbers = [] // numbers in order of appearance
		this.exact = false // is time exact or is not known is it AM/PM
	}

	result() {
		let hours, mins

		if (this.invert) {
			hours = this.numbers[1] || 0
			mins = this.numbers[0] || 0
		} else {
			hours = this.numbers[0] || 0
			mins = this.numbers[1] || 0
		}

		hours += this.hcorrection

		if (mins.length < 2) {
			// add leading zero
			mins = '0' + mins
		}

		return { s: hours + '.' + mins, exact: this.exact }
	}

	run() {
		for (let stateFn = stateBegin; stateFn; stateFn = stateFn(this));
		return this.err
	}

	consume(Type) {
		for (; this.accepts(Type););
	}

	accepts(Type, val) {
		const tok = this.next()
		if (tok.tt != Type || val !== undefined && tok.raw != val) {
			this.backup()
			return false
		}
		return true
	}

	number() {
		let tok = this.next()
		let sum = 0
		let initialized = false
		let val

		loop:
		for (; ;) {
			switch (tok.tt) {
				case tokenType.Number:
					sum += Number(tok.raw)
					initialized = true
					break

				case tokenType.Word:
					val = numericTable[tok.raw]
					if (!val) {
						this.backup()
						break
					}

					sum += Number(val.n)
					initialized = true

					if (val.multipart) {
						this.consume(tokenType.Blank)
						tok = this.next()
						continue loop
					}
					break
			}
			break
		}

		return initialized ? sum : null
	}

	next() {
		if (this.ast.length <= this.pos) {
			return null
		}

		const res = this.ast[this.pos]
		this.pos++
		return res
	}

	backup() {
		this.pos--
	}
}


const stateBegin = (p) => {
	if (p.accepts(tokenType.Word, 'без')) {
		p.invert = true
		return stateBegin
	}

	const n = p.number()

	if (n !== null) {
		p.numbers.push(n)

		if (p.accepts(tokenType.Blank, ':') || p.accepts(tokenType.Blank, '.')) {
			return stateMinutes
		}
	}
}

const stateMinutes = (p) => {
	const n = p.number()

	if (n === null) {
		p.err = new Error(`parse error: given ${p.next()}, want: numeric`)
	}
	p.numbers.push(n)
}

const tokenType = {
	Blank: 'blank',
	Number: 'number',
	Word: 'word'
}

const lexRules = [
	{
		test: /^[:\. ]/,
		emit: (m) => { return { tt: tokenType.Blank, raw: m[0] } }
	},
	{
		test: /^\d+/,
		emit: (m) => { return { tt: tokenType.Number, raw: m[0] } }
	},
	{
		test: /^[^\d :\.]+/,
		emit: (m) => { return { tt: tokenType.Word, raw: m[0] } }
	}
]

function lex(input) {
	const tok = []
	let fail = false

	while (input.length && !fail) {
		(() => {
			for (const rule of lexRules) {
				const m = rule.test.exec(input)
				if (m != null) {
					tok.push(rule.emit(m))
					input = input.slice(m[0].length)
					return
				}
			}
			fail = true
			tok.length = 0 // reset token storage
			tok.err = new Error(`Unexpected string input: ${input}`)
		})()
	}

	return tok
}

const numericTable = {}

	;
(() => {
	[
		{ n: -30, t: 'пол,половина' },
		{ n: 15, t: 'четверти,четверть' },
		{ n: 1, t: 'одна,один,первая,первый,первого' },
		{ n: 2, t: 'две,два,второй,вторая,второго' },
		{ n: 3, t: 'третья,третий,три,третьего' },
		{ n: 4, t: 'четвертая,четвертый,четыре,четвертого' },
		{ n: 5, t: 'пятая,пятый,пять,пятого' },
		{ n: 6, t: 'шестая,шестой,шесть,шестого' },
		{ n: 7, t: 'седьмая,седьмой,семь,седмого' },
		{ n: 8, t: 'восьмая,восьмой,восемь,восьмого' },
		{ n: 9, t: 'девятая,девятый,девять,девятого' },
		{ n: 10, t: 'десятая,десятый,десять,десятого' },
		{ n: 11, t: 'одинадцатая,одинадцатый,одинадцать,одинадцатого' },
		{ n: 12, t: 'двенадцатая,двенадцатый,двенадцать,двенадцатого' },
		{ n: 13, t: 'тренадцатая,тренадцатый,тренадцать,тренадцатого' },
		{ n: 14, t: 'четырнадцатая,четырнадцатый,четырнадцать,четырнадцатого' },
		{ n: 15, t: 'пятнадцатая,пятнадцатый,пятнадцать,пятнадцатого' },
		{ n: 16, t: 'шестадцатая,шестнадцатый,шестнадцать,шестнадцатого' },
		{ n: 17, t: 'семнадцатая,семнадцатый,семнадцать,восемьнадцатого' },
		{ n: 18, t: 'восемнадцатая,восемнадцатый,восемнадцать,девятнадцатого' },
		{ n: 19, t: 'девятнадцатая,девятнадцатый,девятнадцать' },
		{ n: 20, t: 'двадцатая,двадцатый,двадцать,двадцатого', multipart: true },
		{ n: 30, t: 'тридцатая,тридцать', multipart: true },
		{ n: 40, t: 'сороковая,сорок', multipart: true },
		{ n: 50, t: 'пятидесятая,пятьдесят', multipart: true }
	].forEach(({ n, t, multipart }) => {
		t.split(',').forEach((tok) => numericTable[tok] = { n, multipart })
	})
})()