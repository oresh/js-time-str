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
		// internal ast will be mutated
		this.ast = [].concat(ast)
		this.pos = 0 // current position in ast

		this.hours = 0
		this.mins = 0
		this.exact = false
	}

	result() {
		let mins = this.mins + ''
		if (mins.length < 2) {
			// add leading zero
			mins = '0' + mins
		}
		return { s: this.hours + '.' + mins, exact: this.exact }
	}

	run() {
		// use simple strategy: first number is hours and second is minutes
		let hset = false

		while (this.pos < this.ast.length) {
			// todo: mutate, consume

			const tok = this.ast[this.pos]



			let num
			if (tok[0] == 'number') {
				num = tok[1]
			}


			switch (tok[0]) {
				case 'number':
					num = tok[1]
					break
				case 'word':
					if (numbers[tok[1]]) {
						num = numbers[tok[1]].n
					}
					break
			}

			if (hset) {
				this.mins = num
			} else {
				this.hours = num
				hset = true
			}

			this.pos++
		}
	}
}

const lexRules = [
	{
		test: /^[:\. ]/,
		emit: (m) => ['blank', m[0]]
	},
	{
		test: /^\d+/,
		emit: (m) => ['number', m[0]]
	},
	{
		test: /^[^\d :\.]+/,
		emit: (m) => ['word', m[0]]
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

const numbers = {}

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
		t.split(',').forEach((tok) => numbers[tok] = { n, multipart })
	})
})()