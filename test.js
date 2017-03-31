import { parse } from './index.js'

const testdata = [
	{ in: '12 30', want: '12.30' },
	{ in: '12.30', want: '12.30' },
	{ in: '9:49', want: '9.49' },
	{ in: 'без четверти пять', want: '16.45' },
	{ in: 'пол девятого', want: '8.30' },
	{ in: 'двенадцать тридцать', want: '12.30' },
	{ in: 'семь утра', want: '7.00' },
	{ in: 'семнадцать минут двенадцатого', want: '11.17' },
	{ in: 'три часа три минуты', want: '3.03' },
	{ in: 'четверть пятого', want: '16.25' },
	{ in: 'две четверти пятнадцатого', want: '14.30' },
	{ in: 'половина первого', want: '0.30' },
	{ in: 'пол второго', want: '1.30' },
	{ in: '12 часов двадцать три минуты', want: '12.23' },
	{ in: 'сорок две минуты восьмого', want: '7.42' }
]

const fail = (given, want, err) => { console.log(`given: ${given}, want: ${want}, err: ${err}`) }

const test = () => {
	testdata.forEach((tt) => {
		const res = parse(tt.in)
		if (res.s != tt.want) {
			fail(res.s, tt.want, res.err)
		}
	})
}

test()
