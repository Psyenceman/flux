# Flux (experimental)

**An open-source programming language for everyone.**

Flux is an early experimental language interpreter, **not** yet a production-ready language. Its planned website is `flux.flussia.it` (not deployed).

## Quick start

Requires Node.js 20+.

```bash
npm install
npm run build
node dist/src/cli.js examples/hello.flux
npm test
```

Expected output:

```text
Hello, World!
200
```

## Syntax implemented in v0.3

```text
name = "World"
price = 100
total = price * 2
print "Hello, {name}!"
print total
```

Supports strings, numbers, booleans, variable assignments, arithmetic with operator precedence, parentheses, comparison operators (`==`, `!=`, `<`, `<=`, `>`, `>=`), `if` / `else` blocks, `while` loops, nesting, string interpolation, `print`, and line comments starting with `#`.

**Not implemented yet:** functions, `for` loops, modules, web APIs, or database access. No dynamic code evaluation is used.

## Conditional example

```flux
amount = 120
if amount >= 100 {
  print "Discount eligible"
} else {
  print "Standard price"
}
```

Run with `node dist/src/cli.js examples/discount.flux`.

`if` requires a boolean expression. Braces must appear on their own closing line; `else {` starts a separate line. This is experimental syntax and may change.

## Loops

```flux
count = 3
while count > 0 {
  print count
  count = count - 1
}
```

Loops and other statements are subject to a 100,000-step execution limit to guard against accidental infinite loops. This is a basic safeguard, not a complete sandbox.

## Roadmap

1. Formalize the grammar and language specification.
2. Add a tokenizer, parser, AST, and better diagnostics.
3. Expand control flow with functions, loops, and types.
4. Build JavaScript output and optional web libraries.
5. Publish documentation and an online playground.

Flux is designed to remain independent from Flussia, any particular cloud provider, and AI services.

## Naming

Flux is already used by another programming language and other software projects. The project name needs a naming and trademark review before broader distribution.

## License

Apache-2.0. See [the Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
