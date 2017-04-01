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
		this.err = null // last error

		this.invert = false // hours<>minutes inverted form
		this.neg = false // mins = 60 - num
		this.numbers = []
	}

	result() {
		let hours, mins

		if (this.invert) {
			hours = this.numbers[1] || 0
			mins = this.numbers[0] || 0

			hours -= 1
		} else {
			hours = this.numbers[0] || 0
			mins = this.numbers[1] || 0
		}

		if (this.neg) {
			mins = 60 - mins
		}

		if (mins < 10) {
			// add leading zero
			mins = '0' + mins
		}

		return { s: hours + '.' + mins, exact: this.exact }
	}

	run() {
		for (let stateFn = stateHead; stateFn; stateFn = stateFn(this));

		if (this.pos < this.ast.length) {
			this.err = new Error('parse error: input not consumed')
		}

		return this.err
	}

	next() {
		if (this.pos >= this.ast.length) {
			return null
		}

		const tok = this.ast[this.pos]
		this.pos++
		return tok
	}

	backup() {
		this.pos = Math.max(0, this.pos - 1)
	}

	accepts(Type, val) {
		const tok = this.next()

		if (!tok) {
			return false
		}

		if (tok.tt != Type || val !== undefined && tok.raw != val) {
			this.backup()
			return false
		}
		return true
	}

	consume(Type) {
		for (; this.accepts(Type););
	}

	numeric() {
		let res = 0
		let ok = false
		let val

		loop:
		for (; ;) {
			const tok = this.next()

			if (!tok) {
				break
			}

			switch (tok.tt) {
				case tokenType.Number:
					res += Number(tok.raw)
					ok = true
					break
				case tokenType.Word:
					val = numericTable[tok.raw]
					if (!val) {
						this.backup()
						break
					}

					res += Number(val.n)
					ok = true

					if (val.multipart) {
						this.consume(tokenType.Blank)
						continue loop
					}
					break
				default:
					this.backup()
			}

			break // loops multiple times only for multipart numberics
		}

		return ok ? res : null
	}
}

const stateHead = (p) => {
	p.consume(tokenType.Blank)

	const num = p.numeric()

	if (num !== null) {
		p.numbers.push(num)
		return stateAfterFirstNumber
	}

	if (p.accepts(tokenType.Word, 'четверть') || p.accepts(tokenType.Word, 'четверти')) {
		p.invert = true
		p.numbers.push(15)
		return stateAcceptHours
	}

	if (p.accepts(tokenType.Word, 'без')) {
		p.invert = true
		p.neg = true
		return stateHead
	}

	if (p.accepts(tokenType.Word, 'пол') || p.accepts(tokenType.Word, 'половина')) {
		p.invert = true
		p.numbers.push(30)
		return stateAcceptHours
	}
}

const stateAfterFirstNumber = (p) => {
	p.consume(tokenType.Blank)

	const num = p.numeric()

	if (num !== null) {
		p.numbers.push(num)
	}

	if (p.accepts(tokenType.Word, 'четверти')) {
		let n = p.numbers.pop()
		if (!n) {
			n = 1
		}

		if (!p.numbers.length) {
			p.invert = true
		}

		p.numbers.push(n * 15)
		return stateAcceptHours
	}

	if (num !== null) {
		return stateAcceptAttributes
	}

	if (p.accepts(tokenType.Word, 'минут') || p.accepts(tokenType.Word, 'минуты')) {
		p.invert = true
		return stateAcceptHours
	}

	if (p.accepts(tokenType.Word, 'час') || p.accepts(tokenType.Word, 'часа') || p.accepts(tokenType.Word, 'часов')) {
		return stateAcceptMinutes
	}

	// try parse incomplete forms
	return stateAcceptAttributes
}

const stateAcceptHours = (p) => {
	p.consume(tokenType.Blank)

	const num = p.numeric()

	if (num !== null) {
		p.numbers.push(num)

		p.consume(tokenType.Blank)
		p.accepts(tokenType.Word, 'час')
		p.accepts(tokenType.Word, 'часа')
		p.accepts(tokenType.Word, 'часов')

		return stateAcceptAttributes
	}
}

const stateAcceptMinutes = (p) => {
	p.consume(tokenType.Blank)

	const num = p.numeric()

	if (num !== null) {
		p.numbers.push(num)

		p.consume(tokenType.Blank)
		p.accepts(tokenType.Word, 'минут')
		p.accepts(tokenType.Word, 'минуты')

		return stateAcceptAttributes
	}
}

const stateAcceptAttributes = (p) => {
	p.consume(tokenType.Blank)

	const i = p.invert ? 1 : 0
	const hours = p.numbers[i]

	if (p.accepts(tokenType.Word, 'утра')) {
		// no-op
		return
	}

	if (p.accepts(tokenType.Word, 'дня')) {
		if (hours > 0 && hours < 12) {
			p.numbers[i] += 12
		}
		return
	}

	if (p.accepts(tokenType.Word, 'вечера')) {
		if (hours > 0 && hours <= 12) {
			p.numbers[i] += 12
		}
		return
	}

	if (p.accepts(tokenType.Word, 'ночи')) {
		if (hours > 8 && hours <= 12) {
			p.numbers[i] += 12
		}
		return
	}
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