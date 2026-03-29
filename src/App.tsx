import { useEffect, useMemo, useState } from "react";

type Item = {
  id: number;
  brand: string;
  category: string;
  productName: string;
  size: string;
  condition: string;
  purchasePrice: number;
  sellPrice: number;
  shippingCost: number;
  packagingCost: number;
  note: string;
  shotDone: boolean;
  postDone: boolean;
  soldDone: boolean;
};

const STORAGE_KEY = "vintage-archive-items-v1";

const brands = ["나이키", "아디다스", "폴로", "리바이스", "노스페이스", "챔피온", "랄프로렌", "디젤", "칼하트", "스투시", "타미힐피거", "기타"];
const categories = ["바람막이", "맨투맨", "후드티", "셔츠", "데님", "자켓", "트랙탑", "기타"];

const initialItems: Item[] = [
  {
    id: 1,
    brand: "나이키",
    category: "바람막이",
    productName: "나이키 스우시 바람막이",
    size: "L",
    condition: "A",
    purchasePrice: 12000,
    sellPrice: 39000,
    shippingCost: 3500,
    packagingCost: 500,
    note: "블랙, 상태 좋음",
    shotDone: true,
    postDone: false,
    soldDone: false,
  },
  {
    id: 2,
    brand: "폴로",
    category: "셔츠",
    productName: "폴로 스트라이프 셔츠",
    size: "M",
    condition: "A-",
    purchasePrice: 10000,
    sellPrice: 35000,
    shippingCost: 3500,
    packagingCost: 500,
    note: "봄 시즌 추천",
    shotDone: false,
    postDone: false,
    soldDone: false,
  },
];

const emptyForm: Omit<Item, "id"> = {
  brand: "나이키",
  category: "바람막이",
  productName: "",
  size: "",
  condition: "A",
  purchasePrice: 0,
  sellPrice: 0,
  shippingCost: 3500,
  packagingCost: 500,
  note: "",
  shotDone: false,
  postDone: false,
  soldDone: false,
};

function currency(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function profitOf(item: Item) {
  return Number(item.sellPrice || 0) - Number(item.purchasePrice || 0) - Number(item.shippingCost || 0) - Number(item.packagingCost || 0);
}

function captionOf(item: Item) {
  return `${item.productName}

₩${Number(item.sellPrice || 0).toLocaleString("ko-KR")}
사이즈: ${item.size || "문의"}
상태: ${item.condition || "상세 문의"}

✔ ${item.note || "상세 사진 문의 가능합니다"}
📦 당일/익일 발송
📩 구매는 DM 주세요

#빈티지 #빈티지샵 #구제샵 #${item.brand || "빈티지"} #${item.category || "패션"}`;
}

function storyOf(item: Item) {
  return `${item.brand} ${item.category} 신상 업로드
${currency(item.sellPrice)}
구매는 DM 💌`;
}

export default function App() {
  const [items, setItems] = useState<Item[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) as Item[] : initialItems;
    } catch {
      return initialItems;
    }
  });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number>(items[0]?.id ?? 1);
  const [form, setForm] = useState<Omit<Item, "id">>(emptyForm);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.brand, item.category, item.productName, item.size, item.note]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  const selected = items.find((item) => item.id === selectedId) || filteredItems[0] || items[0];

  const totals = useMemo(() => {
    return {
      totalInventory: items.length,
      soldCount: items.filter((i) => i.soldDone).length,
      shotPending: items.filter((i) => !i.shotDone).length,
      postPending: items.filter((i) => i.shotDone && !i.postDone).length,
      expectedProfit: items.filter((i) => !i.soldDone).reduce((sum, i) => sum + profitOf(i), 0),
    };
  }, [items]);

  const recommendedMaxPurchase = Math.floor(Number(form.sellPrice || 0) / 3);

  function updateForm<K extends keyof Omit<Item, "id">>(key: K, value: Omit<Item, "id">[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addItem() {
    if (!form.productName.trim()) {
      alert("상품명을 입력해 주세요.");
      return;
    }
    const newItem: Item = {
      id: Date.now(),
      ...form,
    };
    setItems((prev) => [newItem, ...prev]);
    setSelectedId(newItem.id);
    setForm(emptyForm);
  }

  function toggleField(id: number, field: keyof Pick<Item, "shotDone" | "postDone" | "soldDone">) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: !item[field] } : item)));
  }

  function deleteItem(id: number) {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    if (next[0]) setSelectedId(next[0].id);
  }

  function exportCSV() {
    const headers = ["번호","브랜드","카테고리","상품명","사이즈","상태","매입가","판매가","택배비","포장비","예상순이익","촬영완료","업로드완료","판매완료","메모"];
    const rows = items.map((item, index) => [
      index + 1,
      item.brand,
      item.category,
      item.productName,
      item.size,
      item.condition,
      item.purchasePrice,
      item.sellPrice,
      item.shippingCost,
      item.packagingCost,
      profitOf(item),
      item.shotDone ? "Y" : "N",
      item.postDone ? "Y" : "N",
      item.soldDone ? "Y" : "N",
      item.note,
    ]);
    const escapeCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    downloadBlob(url, "vintage_archive_inventory.csv");
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    downloadBlob(url, "vintage_archive_backup.json");
  }

  function downloadBlob(url: string, filename: string) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function importBackup(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result || "[]")) as Item[];
        if (Array.isArray(parsed)) {
          setItems(parsed);
          if (parsed[0]?.id) setSelectedId(parsed[0].id);
        } else {
          alert("백업 파일 형식이 올바르지 않습니다.");
        }
      } catch {
        alert("백업 파일을 읽을 수 없습니다.");
      }
    };
    reader.readAsText(file);
  }

  function resetData() {
    const ok = window.confirm("저장된 데이터를 모두 초기화할까요?");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    setItems(initialItems);
    setSelectedId(initialItems[0]?.id ?? 1);
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <h1>Vintage Archive 운영 대시보드</h1>
          <p>상품 관리, 마진 계산, 판매글 생성, 백업 저장까지 한 번에.</p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={exportCSV}>CSV 내보내기</button>
          <button className="secondary" onClick={exportBackup}>백업 저장</button>
          <label className="secondary file-button">
            백업 불러오기
            <input
              type="file"
              accept="application/json"
              onChange={(e) => importBackup(e.target.files?.[0] ?? null)}
            />
          </label>
          <button className="secondary danger-soft" onClick={resetData}>전체 초기화</button>
        </div>
      </header>

      <section className="stats-grid">
        <StatCard title="전체 재고" value={String(totals.totalInventory)} />
        <StatCard title="판매 완료" value={String(totals.soldCount)} />
        <StatCard title="촬영 대기" value={String(totals.shotPending)} />
        <StatCard title="업로드 대기" value={String(totals.postPending)} />
        <StatCard title="예상 순이익" value={currency(totals.expectedProfit)} />
      </section>

      <section className="panel-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>상품 등록</h2>
            <p>새 상품을 등록하면 자동으로 저장됩니다.</p>
          </div>
          <div className="form-grid">
            <Field label="브랜드">
              <select value={form.brand} onChange={(e) => updateForm("brand", e.target.value)}>
                {brands.map((brand) => <option key={brand}>{brand}</option>)}
              </select>
            </Field>
            <Field label="카테고리">
              <select value={form.category} onChange={(e) => updateForm("category", e.target.value)}>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="상품명" full>
              <input value={form.productName} onChange={(e) => updateForm("productName", e.target.value)} placeholder="예: 나이키 스우시 바람막이" />
            </Field>
            <Field label="사이즈">
              <input value={form.size} onChange={(e) => updateForm("size", e.target.value)} placeholder="예: L" />
            </Field>
            <Field label="상태">
              <input value={form.condition} onChange={(e) => updateForm("condition", e.target.value)} placeholder="예: A, A-" />
            </Field>
            <Field label="매입가">
              <input type="number" value={form.purchasePrice} onChange={(e) => updateForm("purchasePrice", Number(e.target.value))} />
            </Field>
            <Field label="판매가">
              <input type="number" value={form.sellPrice} onChange={(e) => updateForm("sellPrice", Number(e.target.value))} />
            </Field>
            <Field label="택배비">
              <input type="number" value={form.shippingCost} onChange={(e) => updateForm("shippingCost", Number(e.target.value))} />
            </Field>
            <Field label="포장비">
              <input type="number" value={form.packagingCost} onChange={(e) => updateForm("packagingCost", Number(e.target.value))} />
            </Field>
            <Field label={`권장 최대 매입가: ${currency(recommendedMaxPurchase)}`} full>
              <textarea value={form.note} onChange={(e) => updateForm("note", e.target.value)} placeholder="오염 여부, 특징, 계절감 등을 메모해 두세요." />
            </Field>
          </div>
          <button className="primary add-button" onClick={addItem}>상품 등록하기</button>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>재고 목록</h2>
            <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="브랜드, 상품명 검색" />
          </div>
          <div className="item-list">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                className={`item-card ${selected?.id === item.id ? "selected" : ""}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div>
                  <div className="item-sub">{item.brand} · {item.category}</div>
                  <div className="item-title">{item.productName}</div>
                </div>
                <div className="item-price">{currency(profitOf(item))}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {selected && (
        <>
          <section className="panel-grid">
            <div className="panel">
              <div className="panel-header">
                <h2>상품 상세</h2>
                <p>{selected.brand} · {selected.category}</p>
              </div>
              <h3 className="detail-title">{selected.productName}</h3>
              <div className="detail-grid">
                <InfoBox title="매입가" value={currency(selected.purchasePrice)} />
                <InfoBox title="판매가" value={currency(selected.sellPrice)} />
                <InfoBox title="사이즈" value={selected.size || "-"} />
                <InfoBox title="상태" value={selected.condition || "-"} />
                <InfoBox title="예상 순이익" value={currency(profitOf(selected))} wide />
              </div>
              <div className="note-box">{selected.note || "메모 없음"}</div>
              <div className="check-list">
                <label><input type="checkbox" checked={selected.shotDone} onChange={() => toggleField(selected.id, "shotDone")} /> 촬영 완료</label>
                <label><input type="checkbox" checked={selected.postDone} onChange={() => toggleField(selected.id, "postDone")} /> 업로드 완료</label>
                <label><input type="checkbox" checked={selected.soldDone} onChange={() => toggleField(selected.id, "soldDone")} /> 판매 완료</label>
              </div>
              <button className="secondary danger-soft full" onClick={() => deleteItem(selected.id)}>상품 삭제</button>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h2>판매글 자동 생성</h2>
                <p>복붙해서 바로 사용하세요.</p>
              </div>
              <Field label="인스타 판매글">
                <textarea readOnly value={captionOf(selected)} className="output-area" />
              </Field>
              <Field label="스토리 문구">
                <textarea readOnly value={storyOf(selected)} className="output-area short" />
              </Field>
            </div>
          </section>

          <section className="panel-grid">
            <div className="panel">
              <div className="panel-header">
                <h2>매입 기준 계산</h2>
                <p>판매가 ÷ 3 기준을 바로 확인하세요.</p>
              </div>
              <div className="detail-grid">
                <InfoBox title="현재 판매가" value={currency(selected.sellPrice)} />
                <InfoBox title="권장 최대 매입가" value={currency(Math.floor(selected.sellPrice / 3))} />
              </div>
              <div className={`notice ${selected.purchasePrice <= Math.floor(selected.sellPrice / 3) ? "good" : "bad"}`}>
                {selected.purchasePrice <= Math.floor(selected.sellPrice / 3)
                  ? "좋아요. 현재 매입가는 기준 안에 있습니다."
                  : "주의. 현재 매입가는 높은 편이라 마진이 줄어들 수 있습니다."}
              </div>
              <div className="quick-list">
                <div>나이키/아디다스 바람막이 <strong>8,000 ~ 15,000원</strong></div>
                <div>나이키/아디다스 맨투맨 <strong>5,000 ~ 10,000원</strong></div>
                <div>폴로/랄프로렌 셔츠 <strong>8,000 ~ 15,000원</strong></div>
                <div>리바이스/데님류 <strong>10,000 ~ 20,000원</strong></div>
                <div>노스페이스 아우터 <strong>15,000원 이하 권장</strong></div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <h2>오늘의 운영 체크리스트</h2>
                <p>반복 루틴을 고정하세요.</p>
              </div>
              <div className="todo-list">
                <label><input type="checkbox" /> 게시물 2개 업로드</label>
                <label><input type="checkbox" /> 릴스 1개 업로드</label>
                <label><input type="checkbox" /> 스토리 3개 이상 올리기</label>
                <label><input type="checkbox" /> DM 문의 100% 답변</label>
                <label><input type="checkbox" /> 촬영 대기 상품 확인</label>
                <label><input type="checkbox" /> 업로드 대기 상품 판매글 생성</label>
              </div>
              <div className="notice neutral">
                <strong>월 300 구조:</strong> 하루 3~4개 판매 × 평균 판매가 35,000원 = 월 300~400만원 매출 구조
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="stat-card">
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "field full" : "field"}>
      <label>{label}</label>
      {children}
    </div>
  );
}

function InfoBox({ title, value, wide = false }: { title: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "info-box wide" : "info-box"}>
      <div className="info-title">{title}</div>
      <div className="info-value">{value}</div>
    </div>
  );
}