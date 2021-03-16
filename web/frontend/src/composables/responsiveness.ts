export default () => {
  const params = new URLSearchParams(window.location.search)
  const isProdLineScreen = params.get("client") === "prodline"

  return {
    isProdLineScreen
  }
}
