import "dotenv/config"

const username = "kalpal"

async function run() {
  const res = await fetch(
    `https://letterboxd.com/${encodeURIComponent(username)}/rss/`,
  )
  if (res.status === 404) {
    console.error("Feed not found")
    return
  }
  const raw = await res.text()
  console.log(raw)
}

run().catch((err) => {
  console.error(err)
})
