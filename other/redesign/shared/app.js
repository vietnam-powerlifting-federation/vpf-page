/* Shared behaviour for the rankings preview: sample data, filters, table, i18n, theme, style switcher. */

const DICT = {
  en: {
    skip: "Skip to rankings",
    federation: "Vietnam Powerlifting Federation",
    navLabel: "Main", navRankings: "Rankings", navRecords: "Records", navCompetitions: "Competitions",
    language: "Language", appearance: "Appearance", dark: "Dark", light: "Light",
    toDark: "Switch to dark theme", toLight: "Switch to light theme",
    login: "Log in", menu: "Menu", openMenu: "Open menu", closeMenu: "Close menu",
    kicker: "Official standings",
    title: "Athlete Rankings",
    lede: "The best result of every VPF athlete, ranked from strongest to weakest.",
    glQuestion: "What are GL points?",
    glAnswer1: "GL points (IPF GL) compare lifters of different body weights fairly. A light lifter and a heavy lifter with the same GL score are equally strong for their size.",
    glAnswer2: "Total is the sum of the best squat, bench press and deadlift. All weights are in kilograms.",
    leaders: "Leading the table",
    filterLabel: "Filter rankings",
    searchLabel: "Search athlete", searchPlaceholder: "Name or VPF ID", clearSearch: "Clear search",
    searchHint: "Accents are optional — “nguyen van an” finds “Nguyễn Văn An”.",
    moreFilters: "Filters",
    sex: "Category", all: "All", men: "Men", women: "Women",
    weightClass: "Weight class", division: "Division", meetType: "Competition type",
    sortBy: "Rank by", athlete: "Athlete",
    squat: "Squat", bench: "Bench", deadlift: "Deadlift", total: "Total", gl: "GL points",
    reset: "Reset filters", removeFilter: "Remove filter",
    count: n => n === 1 ? "1 athlete" : `${n} athletes`,
    caption: s => `Athlete rankings, sorted by ${s}`,
    scrollHint: "Swipe the table sideways to see every lift.",
    emptyTitle: "No athletes match",
    emptyBody: "Try a different name, or remove a filter to see more athletes.",
    pages: "Pages", perPage: "Rows per page", prev: "Previous page", next: "Next page",
    pageStatus: (a, b, n) => `${a}–${b} of ${n}`,
    footNote: "Results are official once a competition is closed.",
    div: { subjr: "Sub-Junior", jr: "Junior", open: "Open", mas1: "Master I", mas2: "Master II", mas3: "Master III", mas4: "Master IV" },
    meet: { national: "National Championship", national_qualifier: "National Qualifier", amateur: "Amateur" },
    sexName: { male: "Men", female: "Women" },
  },
  vi: {
    skip: "Bỏ qua đến bảng xếp hạng",
    federation: "Liên đoàn Powerlifting Việt Nam",
    navLabel: "Điều hướng chính", navRankings: "Bảng xếp hạng", navRecords: "Kỷ lục", navCompetitions: "Giải đấu",
    language: "Ngôn ngữ", appearance: "Giao diện", dark: "Tối", light: "Sáng",
    toDark: "Chuyển sang giao diện tối", toLight: "Chuyển sang giao diện sáng",
    login: "Đăng nhập", menu: "Menu", openMenu: "Mở menu", closeMenu: "Đóng menu",
    kicker: "Bảng xếp hạng chính thức",
    title: "Bảng xếp hạng vận động viên",
    lede: "Thành tích tốt nhất của mỗi vận động viên VPF, xếp từ mạnh nhất đến yếu nhất.",
    glQuestion: "Điểm GL là gì?",
    glAnswer1: "Điểm GL (IPF GL) giúp so sánh công bằng giữa các vận động viên có cân nặng khác nhau. Hai người có cùng điểm GL thì mạnh như nhau so với cân nặng của mình.",
    glAnswer2: "Tổng là tổng của mức squat, bench press và deadlift tốt nhất. Tất cả khối lượng tính bằng kilôgam.",
    leaders: "Dẫn đầu bảng xếp hạng",
    filterLabel: "Lọc bảng xếp hạng",
    searchLabel: "Tìm vận động viên", searchPlaceholder: "Tên hoặc VPF ID", clearSearch: "Xoá tìm kiếm",
    searchHint: "Không cần gõ dấu — “nguyen van an” sẽ tìm thấy “Nguyễn Văn An”.",
    moreFilters: "Bộ lọc",
    sex: "Nội dung", all: "Tất cả", men: "Nam", women: "Nữ",
    weightClass: "Hạng cân", division: "Hạng tuổi", meetType: "Loại giải đấu",
    sortBy: "Xếp hạng theo", athlete: "Vận động viên",
    squat: "Squat", bench: "Bench", deadlift: "Deadlift", total: "Tổng", gl: "Điểm GL",
    reset: "Xoá bộ lọc", removeFilter: "Bỏ bộ lọc",
    count: n => `${n} vận động viên`,
    caption: s => `Bảng xếp hạng vận động viên, sắp xếp theo ${s}`,
    scrollHint: "Vuốt ngang bảng để xem tất cả các mức tạ.",
    emptyTitle: "Không có vận động viên phù hợp",
    emptyBody: "Hãy thử tên khác, hoặc bỏ bớt bộ lọc để xem thêm vận động viên.",
    pages: "Trang", perPage: "Số dòng mỗi trang", prev: "Trang trước", next: "Trang sau",
    pageStatus: (a, b, n) => `${a}–${b} trên ${n}`,
    footNote: "Kết quả chính thức sau khi giải đấu kết thúc.",
    div: { subjr: "Sub-Junior", jr: "Junior", open: "Open", mas1: "Master I", mas2: "Master II", mas3: "Master III", mas4: "Master IV" },
    meet: { national: "Giải vô địch quốc gia", national_qualifier: "Giải vòng loại quốc gia", amateur: "Nghiệp dư" },
    sexName: { male: "Nam", female: "Nữ" },
  },
}

/* ---------- Sample data (same GL formula as lib/domain/meet-result.ts) ---------- */
const GL = { male: { a: 1199.72839, b: 1025.18162, c: 0.00921 }, female: { a: 610.32796, b: 1045.59282, c: 0.03048 } }
const glOf = (total, bw, sex) => { const { a, b, c } = GL[sex]; return Math.round(100 * total / (a - b * Math.exp(-c * bw)) * 100) / 100 }
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const rand = rng(2026)
const CLASSES = { male: [59, 66, 74, 83, 93, 105, 120, 999], female: [47, 52, 57, 63, 69, 76, 84, 999] }
const DIVS = ["open", "open", "open", "jr", "jr", "subjr", "mas1", "mas2"]
const MEETS = ["national", "national", "national_qualifier", "amateur"]
const NAMES = [
  ["Nguyễn Văn An", "male"], ["Trần Minh Khoa", "male"], ["Lê Thị Hoa", "female"], ["Phạm Quốc Bảo", "male"],
  ["Hoàng Gia Huy", "male"], ["Võ Thanh Tâm", "female"], ["Đặng Ngọc Lan", "female"], ["Bùi Đức Thịnh", "male"],
  ["Đỗ Mai Anh", "female"], ["Ngô Hải Đăng", "male"], ["Dương Thu Trang", "female"], ["Lý Hoàng Nam", "male"],
  ["Phan Thảo Vy", "female"], ["Vũ Tuấn Kiệt", "male"], ["Trịnh Bảo Ngọc", "female"], ["Huỳnh Nhật Minh", "male"],
  ["Mai Phương Linh", "female"], ["Tô Quang Vinh", "male"], ["Châu Kim Ngân", "female"], ["Lâm Đức Anh", "male"],
  ["Kiều Thanh Hương", "female"], ["Tạ Minh Trí", "male"], ["Hồ Ngọc Hân", "female"], ["Cao Văn Long", "male"],
  ["Đinh Thùy Dung", "female"], ["La Gia Bảo", "male"], ["Quách Hữu Phước", "male"], ["Thái Mỹ Duyên", "female"],
  ["Lưu Khánh Toàn", "male"], ["Triệu Vân Anh", "female"], ["Nguyễn Hoàng Phúc", "male"], ["Trần Bích Ngọc", "female"],
  ["Lê Quang Huy", "male"], ["Phạm Thị Thu", "female"], ["Võ Minh Quân", "male"], ["Đoàn Khánh Linh", "female"],
  ["Hà Văn Đức", "male"], ["Nguyễn Thị Yến", "female"], ["Trương Công Danh", "male"], ["Lê Hồng Nhung", "female"],
]
const round25 = x => Math.round(x / 2.5) * 2.5
const ATHLETES = NAMES.map(([name, sex], i) => {
  const cls = CLASSES[sex][Math.floor(rand() * CLASSES[sex].length)]
  const bw = cls === 999 ? (sex === "male" ? 120 : 84) + 2 + rand() * 18 : cls - rand() * 5
  const target = (sex === "male" ? 52 : 48) + rand() * 42
  const { a, b, c } = GL[sex]
  const total = target * (a - b * Math.exp(-c * bw)) / 100
  const squat = round25(total * (0.35 + rand() * 0.03))
  const bench = round25(total * (sex === "male" ? 0.24 : 0.21) + rand() * 5)
  const deadlift = round25(total - squat - bench)
  const t = squat + bench + deadlift
  return {
    id: "VPF" + String(100 + i * 37).padStart(6, "0"), name, sex, cls, bw,
    div: DIVS[Math.floor(rand() * DIVS.length)], meet: MEETS[Math.floor(rand() * MEETS.length)],
    squat, bench, deadlift, total: t, gl: glOf(t, bw, sex),
  }
})

/* ---------- State & helpers ---------- */
const SORTS = ["gl", "total", "squat", "bench", "deadlift"]
const state = { lang: "en", q: "", sex: "", cls: "", div: "", meet: "", sort: "gl", page: 1, size: 25 }
const $ = s => document.querySelector(s)
const $$ = s => [...document.querySelectorAll(s)]
const t = k => DICT[state.lang][k]
const locale = () => state.lang === "vi" ? "vi-VN" : "en-GB"
const fold = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase()
const kg = n => n.toLocaleString(locale(), { maximumFractionDigits: 1 })
const pts = n => n.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const clsLabel = (c, sex) => c === 999 ? `${sex === "male" ? 120 : 84}+ kg` : `${c} kg`
const meta = a => `${t("sexName")[a.sex]} · ${clsLabel(a.cls, a.sex)} · ${t("div")[a.div]}`
const fmtSort = (a, key) => key === "gl" ? pts(a.gl) : kg(a[key])
const sortUnit = key => key === "gl" ? "GL" : "kg"

function readUrl() {
  const p = new URLSearchParams(location.search)
  for (const k of ["q", "sex", "cls", "div", "meet"]) if (p.has(k)) state[k] = p.get(k)
  if (SORTS.includes(p.get("sort"))) state.sort = p.get("sort")
  if (p.get("lang") === "vi") state.lang = "vi"
}
function writeUrl() {
  const p = new URLSearchParams()
  p.set("style", document.documentElement.dataset.style)
  for (const k of ["q", "sex", "cls", "div", "meet"]) if (state[k]) p.set(k, state[k])
  if (state.sort !== "gl") p.set("sort", state.sort)
  if (state.lang !== "en") p.set("lang", state.lang)
  try { history.replaceState(null, "", "?" + p) } catch {}
}

/* ---------- Rendering ---------- */
function fillSelects() {
  const opt = (v, l, sel) => `<option value="${v}"${sel ? " selected" : ""}>${l}</option>`
  const sexes = state.sex ? [state.sex] : ["male", "female"]
  if (state.cls && !sexes.some(s => state.cls.startsWith(s))) state.cls = ""
  $("#f-class").innerHTML = opt("", t("all"), !state.cls) + sexes.map(s =>
    `<optgroup label="${t("sexName")[s]}">` + CLASSES[s].map(c => opt(`${s}-${c}`, clsLabel(c, s), state.cls === `${s}-${c}`)).join("") + "</optgroup>").join("")
  $("#f-div").innerHTML = opt("", t("all"), !state.div) + Object.entries(t("div")).map(([k, l]) => opt(k, l, state.div === k)).join("")
  $("#f-meet").innerHTML = opt("", t("all"), !state.meet) + Object.entries(t("meet")).map(([k, l]) => opt(k, l, state.meet === k)).join("")
  $("#f-sort").innerHTML = SORTS.map(s => opt(s, t(s), state.sort === s)).join("")
  $$('input[name="sex"]').forEach(r => { r.checked = r.value === state.sex })
}

function headers() {
  $$("th[data-sort]").forEach(th => {
    const key = th.dataset.sort
    const label = t(key) + (key === "gl" ? "" : " (kg)")
    th.innerHTML = `<button type="button" class="sort-btn" data-key="${key}">${label}<svg class="icon" aria-hidden="true"><use href="#i-arrow-down"/></svg></button>`
    if (key === state.sort) th.setAttribute("aria-sort", "descending"); else th.removeAttribute("aria-sort")
  })
}

function renderPodium(ranked) {
  const top = ranked.slice(0, 3)
  $("#podium").hidden = top.length === 0
  $("#podium-list").innerHTML = top.map(a => `
    <li class="podium-item p${a.rank}">
      <span class="podium-rank"><span class="visually-hidden">#</span>${a.rank}</span>
      <a class="podium-name" href="#">${a.name}</a>
      <span class="podium-meta">${meta(a)}</span>
      <span class="podium-score">${fmtSort(a, state.sort)}<small>${sortUnit(state.sort)}</small></span>
    </li>`).join("")
}

function render() {
  // Rank inside the filter set; searching narrows the list but keeps each athlete's rank.
  const ranked = ATHLETES
    .filter(a => (!state.sex || a.sex === state.sex)
      && (!state.cls || `${a.sex}-${a.cls}` === state.cls)
      && (!state.div || a.div === state.div)
      && (!state.meet || a.meet === state.meet))
    .sort((x, y) => y[state.sort] - x[state.sort])
    .map((a, i) => ({ ...a, rank: i + 1 }))
  const q = fold(state.q.trim())
  const rows = q ? ranked.filter(a => fold(a.name).includes(q) || fold(a.id).includes(q)) : ranked

  const pages = Math.max(1, Math.ceil(rows.length / state.size))
  state.page = Math.min(state.page, pages)
  const start = (state.page - 1) * state.size
  const view = rows.slice(start, start + state.size)
  const num = (key, html) => `<td class="num${key === state.sort ? " is-sorted" : ""}">${html}</td>`

  $("#tbody").innerHTML = view.map(a => `
    <tr>
      <td class="c-rank"><span class="rank${a.rank <= 3 ? " r" + a.rank : ""}">${a.rank}</span></td>
      <td class="c-name"><a class="athlete-name" href="#">${a.name}</a><span class="athlete-meta">${meta(a)}</span></td>
      ${num("gl", `<span class="gl">${pts(a.gl)}</span>`)}
      ${num("total", kg(a.total))}
      ${num("squat", kg(a.squat))}
      ${num("bench", kg(a.bench))}
      ${num("deadlift", kg(a.deadlift))}
    </tr>`).join("")

  renderPodium(ranked)
  $("#scroll-wrap").hidden = rows.length === 0
  $("#empty").hidden = rows.length !== 0
  $("#pager").hidden = rows.length === 0
  $("#caption").textContent = t("caption")(t(state.sort))
  $("#result-count").textContent = t("count")(rows.length)
  $("#pager-status").textContent = t("pageStatus")(rows.length ? start + 1 : 0, start + view.length, rows.length)
  $("#prev").disabled = state.page <= 1
  $("#next").disabled = state.page >= pages

  const chips = []
  if (state.q) chips.push(["q", `“${state.q}”`])
  if (state.sex) chips.push(["sex", t("sexName")[state.sex]])
  if (state.cls) { const [s, c] = state.cls.split("-"); chips.push(["cls", clsLabel(+c, s)]) }
  if (state.div) chips.push(["div", t("div")[state.div]])
  if (state.meet) chips.push(["meet", t("meet")[state.meet]])
  $("#chips").innerHTML = chips.map(([k, l]) =>
    `<button type="button" class="chip" data-chip="${k}" aria-label="${t("removeFilter")}: ${l}">${l}<svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>`).join("")
  $("#reset").hidden = chips.length === 0
  const n = ["sex", "cls", "div", "meet"].filter(k => state[k]).length + (state.sort !== "gl" ? 1 : 0)
  $("#filter-count").hidden = n === 0
  $("#filter-count").textContent = n
  $(".search-wrap").classList.toggle("has-value", !!state.q)
  headers()
  syncScroll()
  writeUrl()
}

function applyLang() {
  document.documentElement.lang = state.lang
  $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n) })
  $$("[data-i18n-attr]").forEach(el => el.dataset.i18nAttr.split(",").forEach(pair => {
    const [attr, key] = pair.split(":"); el.setAttribute(attr, t(key))
  }))
  $$("[data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang)))
  document.title = `${t("title")} · VPF`
  $("#dateline").textContent = new Date().toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  applyThemeLabel()
  fillSelects()
  render()
}

/* ---------- Horizontal scroll affordances ---------- */
const scroller = $("#table-scroll")
function syncScroll() {
  const overflows = scroller.scrollWidth > scroller.clientWidth + 1
  $("#scroll-wrap").toggleAttribute("data-overflows", overflows)
  scroller.toggleAttribute("data-scrolled", scroller.scrollLeft > 0)
  scroller.tabIndex = overflows ? 0 : -1
}
scroller.addEventListener("scroll", () => scroller.toggleAttribute("data-scrolled", scroller.scrollLeft > 0), { passive: true })
new ResizeObserver(syncScroll).observe(scroller)

/* ---------- Theme & style ---------- */
const isDark = () => {
  const th = document.documentElement.dataset.theme
  return th === "dark" || (th !== "light" && matchMedia("(prefers-color-scheme: dark)").matches)
}
function applyThemeLabel() {
  const dark = isDark()
  $$(".theme-toggle").forEach(b => {
    b.setAttribute("aria-label", t(dark ? "toLight" : "toDark"))
    b.querySelector("use").setAttribute("href", dark ? "#i-sun" : "#i-moon")
    const txt = b.querySelector(".theme-toggle-text")
    if (txt) txt.textContent = t(dark ? "light" : "dark")
  })
}
function applyStyle(name) {
  document.documentElement.dataset.style = name
  $("#style-css").href = `styles/${name}.css`
  $$("[data-style]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.style === name)))
  writeUrl()
}

/* ---------- Events ---------- */
let searchTimer
$("#q").addEventListener("input", e => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { state.q = e.target.value; state.page = 1; render() }, 120)
})
$(".search-clear").addEventListener("click", () => { $("#q").value = ""; state.q = ""; render(); $("#q").focus() })
$$('input[name="sex"]').forEach(r => r.addEventListener("change", () => { state.sex = r.value; state.page = 1; fillSelects(); render() }))
$("#f-class").addEventListener("change", e => { state.cls = e.target.value; state.page = 1; render() })
$("#f-div").addEventListener("change", e => { state.div = e.target.value; state.page = 1; render() })
$("#f-meet").addEventListener("change", e => { state.meet = e.target.value; state.page = 1; render() })
$("#f-sort").addEventListener("change", e => { state.sort = e.target.value; state.page = 1; render() })
$("#table thead").addEventListener("click", e => {
  const b = e.target.closest(".sort-btn"); if (!b) return
  state.sort = b.dataset.key; state.page = 1; fillSelects(); render()
  $(`.sort-btn[data-key="${state.sort}"]`).focus()
})
$("#chips").addEventListener("click", e => {
  const c = e.target.closest("[data-chip]"); if (!c) return
  const k = c.dataset.chip
  state[k] = ""; if (k === "q") $("#q").value = ""
  state.page = 1; fillSelects(); render()
  ;($("#chips .chip") || $("#q")).focus()
})
const resetAll = () => {
  Object.assign(state, { q: "", sex: "", cls: "", div: "", meet: "", sort: "gl", page: 1 })
  $("#q").value = ""; fillSelects(); render(); $("#q").focus()
}
$("#reset").addEventListener("click", resetAll)
$("#empty-reset").addEventListener("click", resetAll)
$("#page-size").addEventListener("change", e => { state.size = +e.target.value; state.page = 1; render() })
const goPage = d => { state.page += d; render(); $("#rankings").focus({ preventScroll: true }); $("#rankings").scrollIntoView({ block: "start" }) }
$("#prev").addEventListener("click", () => goPage(-1))
$("#next").addEventListener("click", () => goPage(1))

$$("[data-lang]").forEach(b => b.addEventListener("click", () => { state.lang = b.dataset.lang; applyLang() }))
$$(".theme-toggle").forEach(b => b.addEventListener("click", () => {
  const next = isDark() ? "light" : "dark"
  document.documentElement.dataset.theme = next
  try { localStorage.setItem("vpf-theme", next) } catch {}
  applyThemeLabel()
}))
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyThemeLabel)
$$("[data-style]").forEach(b => b.addEventListener("click", () => applyStyle(b.dataset.style)))

const drawer = $("#drawer")
$(".menu-toggle").addEventListener("click", () => drawer.showModal())
drawer.querySelector("[data-close]").addEventListener("click", () => drawer.close())
drawer.addEventListener("click", e => { if (e.target === drawer) drawer.close() })
matchMedia("(min-width: 900px)").addEventListener("change", e => { if (e.matches && drawer.open) drawer.close() })

const wide = matchMedia("(min-width: 768px)")
const syncFilters = () => { if (wide.matches) $("#more-filters").open = true }
wide.addEventListener("change", syncFilters)

readUrl()
$("#q").value = state.q
if (["sex", "cls", "div", "meet"].some(k => state[k])) $("#more-filters").open = true
syncFilters()
applyStyle(document.documentElement.dataset.style)
applyLang()
