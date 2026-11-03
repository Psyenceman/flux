# Flux: simple business rule
customer = "Ada"
total = 120
discount = 20
if total >= 100 {
  print "Discount available for {customer}"
  final = total - discount
} else {
  final = total
}
print "Total: {final}"
