// Flux Studio v0.5 — offline-first interactive lessons.
export const lessons = [
  {
    "id": 1,
    "title": "Hello, Flux",
    "description": "Use print to display text.",
    "example": "print \"Hello, Flux!\"",
    "challenge": "Change the message to Hello, World!",
    "solution": "print \"Hello, World!\"",
    "expected": "Hello, World!"
  },
  {
    "id": 2,
    "title": "Variables",
    "description": "Store values with = and use them later.",
    "example": "name = \"Ada\"\nprint \"Hello, {name}!\"",
    "challenge": "Change the name to Flux.",
    "solution": "name = \"Flux\"\nprint \"Hello, {name}!\"",
    "expected": "Hello, Flux!"
  },
  {
    "id": 3,
    "title": "Arithmetic",
    "description": "Use +, -, * and / with numbers.",
    "example": "price = 12\nquantity = 3\nprint price * quantity",
    "challenge": "Calculate 7 * 6 and print it.",
    "solution": "print 7 * 6",
    "expected": "42"
  },
  {
    "id": 4,
    "title": "Conditions",
    "description": "Use if to execute code when a comparison is true.",
    "example": "age = 20\nif age >= 18 {\n  print \"Adult\"\n}",
    "challenge": "Print Ready when score is greater than 50.",
    "solution": "score = 60\nif score > 50 {\n  print \"Ready\"\n}",
    "expected": "Ready"
  },
  {
    "id": 5,
    "title": "Loops",
    "description": "Use while to repeat instructions. Update the counter to stop.",
    "example": "count = 3\nwhile count > 0 {\n  print count\n  count = count - 1\n}",
    "challenge": "Print 2 and then 1 with a while loop.",
    "solution": "count = 2\nwhile count > 0 {\n  print count\n  count = count - 1\n}",
    "expected": "2\n1"
  },
  {
    "id": 6,
    "title": "Functions",
    "description": "Define a function and call it with arguments.",
    "example": "function greet(name) {\n  print \"Hello, {name}!\"\n}\ngreet(\"Ada\")",
    "challenge": "Write a greet function that prints Hello, Flux!",
    "solution": "function greet(name) {\n  print \"Hello, {name}!\"\n}\ngreet(\"Flux\")",
    "expected": "Hello, Flux!"
  },
  {
    "id": 7,
    "title": "Mini project",
    "description": "Combine variables, conditions and output.",
    "example": "total = 120\nif total >= 100 {\n  print \"Free shipping\"\n} else {\n  print \"Shipping applies\"\n}",
    "challenge": "Print Free shipping when total is 150.",
    "solution": "total = 150\nif total >= 100 {\n  print \"Free shipping\"\n} else {\n  print \"Shipping applies\"\n}",
    "expected": "Free shipping"
  }
];
export const reference = [
{title:'Output',syntax:'print "Hello"',detail:'Print a value or expression.'},
{title:'Variables',syntax:'name = "Ada"',detail:'Assign numbers, strings or booleans. Strings support {name} interpolation.'},
{title:'Math',syntax:'print (2 + 3) * 4',detail:'Operators: +, -, *, /.'},
{title:'Comparison',syntax:'print 5 >= 3',detail:'Operators: ==, !=, <, <=, >, >=.'},
{title:'Conditionals',syntax:'if score > 50 {\\n  print "Pass"\\n} else {\\n  print "Try again"\\n}',detail:'Conditions must evaluate to a boolean.'},
{title:'Loops',syntax:'while count > 0 {\\n  print count\\n  count = count - 1\\n}',detail:'A while loop repeats until its condition becomes false.'},
{title:'Functions',syntax:'function greet(name) {\\n  print "Hi, {name}"\\n}\\ngreet("Ada")',detail:'Functions accept parameters and use local variables. Return values are not supported yet.'},
{title:'Comments',syntax:'# This is a comment',detail:'A line beginning with # is ignored.'}
];
