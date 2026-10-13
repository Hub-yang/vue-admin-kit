export function serialize(data: AnyKey): string {
  const list: any[] = []
  Object.keys(data).forEach((ele) => {
    list.push(`${ele}=${data[ele]}`)
  })
  return list.join('&')
}
