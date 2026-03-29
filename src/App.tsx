import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabase";

type Item = {
  id: string;
  brand: string;
  category: string;
  product_name: string;
  size: string;
  condition: string;
  purchase_price: number;
  sell_price: number;
  shipping_cost: number;
  packaging_cost: number;
  note: string;
  shot_done: boolean;
  post_done: boolean;
  sold_done: boolean;
  created_at?: string;
};

type FormState = {
  brand: string;
  category: string;
  product_name: string;
  size: string;
  condition: string;
  purchase_price: number;
  sell_price: number;
  shipping_cost: number;
  packaging_cost: number;
  note: string;
  shot_done: boolean;
  post_done: boolean;
  sold_done: boolean;
};

const brands = ["나이키", "아디다스", "폴로 랄프로렌", "리바이스", "노스페이스", "챔피온", "디젤", "칼하트", "스투시", "타미힐피거", "기타"];
const categories = ["바람막이", "맨투맨", "후드티", "셔츠", "데님", "자켓", "트랙탑", "니트", "기타"];

const emptyForm: FormState = {
  brand: "나이키",
  category: "바람막이",
  product_name: "",
  size: "",
  condition: "A",
  purchase_price: 0,
  sell_price: 0,
  shipping_cost: 3500,
  packaging_cost: 500,
  note: "",
  shot_done: false,
  post_done: false,
  sold_done: false,
};

function currency(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function profitOf(item: Pick<Item, "sell_price" | "purchase_price" | "shipping_cost" | "packaging_cost">) {
  return Number(item.sell_price || 0) - Number(item.purchase_price || 0) - Number(item.shipping_cost || 0) - Number(item.packaging_cost || 0);
}

function captionOf(item: Item) {
  return `${item.product_name}

₩${Number(item.sell_price || 0).toLocaleString("ko-KR")}
사이즈: ${item.size || "문의"}
상태: ${item.condition || "상세 문의"}

✔ ${item.note || "상세 사진 문의 가능합니다"}
📦 당일/익일 발송
📩 구매는 DM 주세요

#빈티지 #빈티지샵 #구제샵 #${item.brand || "빈티지"} #${item.category || "패션"}`;
}

function storyOf(item: Item) {
  return `${item.brand} ${item.category} 신상 업로드
${currency(item.sell_price)}
구매는 DM 💌`;
}

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string>("");

  async function loadItems() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("데이터를 불러오지 못했어요. Supabase 설정을 확인해 주세요.");
    } else {
      const normalized = (data ?? []).map((item) => ({
        ...item,
        brand: item.brand === "폴로" || item.brand === "랄프로렌" ? "폴로 랄프로렌" : item.brand,
      })) as Item[];

      setItems(normalized);
      if (normalized[0]?.id) setSelectedId(normalized[0].id);
      setMessage("클라우드 동기화 완료");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.brand, item.category, item.product_name, item.size, item.note]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  const selected = items.find((item) => item.id === selectedId) || filteredItems[0] || items[0];

  const totals = useMemo(() => {
    return {
      totalInventory: items.length,
      soldCount: items.filter((i) => i.sold_done).length,
      shotPending: items.filter((i) => !i.shot_done).length,
      postPending: items.filter((i) => i.shot_done && !i.post_done).length,
      expectedProfit: items.filter((i) => !i.sold_done).reduce((sum, i) => sum + profitOf(i), 0),
    };
  }, [items]);

  const recommendedMaxPurchase = Math.floor(Number(form.sell_price || 0) / 3);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveItem() {
    if (!supabase) return;
    if (!form.product_name.trim()) {
      alert("상품명을 입력해 주세요.");
      return;
    }

    const normalizedForm = {
      ...form,
      brand: form.brand === "폴로" || form.brand === "랄프로렌" ? "폴로 랄프로렌" : form.brand,
    };

    setSaving(true);

    if (editingId) {
      const { error } = await supabase.from("items").update(normalizedForm).eq("id", editingId);
      if (error) {
        setMessage("수정에 실패했어요.");
      } else {
        setMessage("상품이 수정됐어요.");
        setEditingId("");
        setForm(emptyForm);
        await loadItems();
      }
    } else {
      const { error } = await supabase.from("items").insert([normalizedForm]);
      if (error) {
        setMessage("저장에 실패했어요.");
      } else {
        setForm(emptyForm);
        setMessage("상품이 클라우드에 저장됐어요.");
        await loadItems();
      }
    }

    setSaving(false);
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setForm({
      brand: item.brand === "폴로" || item.brand === "랄프로렌" ? "폴로 랄프로렌" : item.brand,
      category: item.category,
      product_name: item.product_name,
      size: item.size,
      condition: item.condition,
      purchase_price: item.purchase_price,
      sell_price: item.sell_price,
      shipping_cost: item.shipping_cost,
      packaging_cost: item.packaging_cost,
      note: item.note,
      shot_done: item.shot_done,
      post_done: item.post_done,
      sold_done: item.sold_done,
    });
    setMessage("수정 모드예요. 내용을 바꾸고 저장해 주세요.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId("");
    setForm(emptyForm);
    setMessage("수정 모드를 취소했어요.");
  }

  async function updateField(id: string, field: keyof Pick<Item, "shot_done" | "post_done" | "sold_done">, value: boolean) {
    if (!supabase) return;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    const { error } = await supabase.from("items").update({ [field]: value }).eq("id", id);
    if (error) setMessage("상태 저장에 실패했어요.");
  }

  async function deleteItem(id: string) {
    if (!supabase) return;
    const ok = window.confirm("이 상품을 삭제할까요?");
    if (!ok) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      setMessage("삭제에 실패했어요.");
    } else {
      setMessage("삭제 완료");
      if (editingId === id) {
        setEditingId("");
        setForm(emptyForm);
      }
      await loadItems();
    }
  }

  function exportCSV() {
    const headers = ["번호","브랜드","카테고리","상품명","사이즈","상태","매입가","판매가","택배비","포장비","예상순이익","촬영완료","업로드완료","판매완료","메모"];
    const rows = items.map((item, index) => [
      index + 1,
      item.brand,
      item.category,
      item.product_name,
      item.size,
      item.condition,
      item.purchase_price,
      item.sell_price,
      item.shipping_cost,
      item.packaging_cost,
      profitOf(item),
      item.shot_done ? "Y" : "N",
      item.post_done ? "Y" : "N",
      item.sold_done ? "Y" : "N",
      item.note,
    ]);
    const escapeCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vintage_archive_inventory.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="app-shell">
        <header className="header">
          <div>
            <h1>Vintage Archive 클라우드 버전 설정 안내</h1>
            <p>무료 Supabase를 연결하면 휴대폰과 PC에서 같은 데이터를 볼 수 있어요.</p>
          </div>
        </header>

        <section className="panel">
          <div className="panel-header">
            <h2>1분 설정 체크리스트</h2>
          </div>
          <ol className="setup-list">
            <li>Supabase에서 무료 프로젝트 생성</li>
            <li>SQL Editor에 <code>supabase_setup.sql</code> 내용 붙여넣기 후 실행</li>
            <li>Project Settings → API에서 URL, anon key 복사</li>
            <li>Vercel 환경변수에 <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code> 추가</li>
            <li>Redeploy 하면 클라우드 동기화 시작</li>
          </ol>
          <div className="notice neutral">
            이 화면이 보이면 아직 환경변수가 연결되지 않은 상태예요.
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <h1>Vintage Archive 클라우드 대시보드</h1>
          <p>어디서 접속해도 같은 데이터를 보는 버전입니다.</p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={exportCSV}>CSV 내보내기</button>
          <button className="secondary" onClick={loadItems}>새로고침</button>
        </div>
      </header>

      {message && <div className="banner">{message}</div>}

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
            <h2>{editingId ? "상품 수정" : "상품 등록"}</h2>
            <p>{editingId ? "수정 중인 상품을 저장하는 단계예요." : saving ? "저장 중..." : "클라우드에 바로 저장됩니다."}</p>
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
              <input value={form.product_name} onChange={(e) => updateForm("product_name", e.target.value)} placeholder="예: 나이키 스우시 바람막이" />
            </Field>
            <Field label="사이즈">
              <input value={form.size} onChange={(e) => updateForm("size", e.target.value)} placeholder="예: L" />
            </Field>
            <Field label="상태">
              <input value={form.condition} onChange={(e) => updateForm("condition", e.target.value)} placeholder="예: A, A-" />
            </Field>
            <Field label="매입가">
              <input type="number" value={form.purchase_price} onChange={(e) => updateForm("purchase_price", Number(e.target.value))} />
            </Field>
            <Field label="판매가">
              <input type="number" value={form.sell_price} onChange={(e) => updateForm("sell_price", Number(e.target.value))} />
            </Field>
            <Field label="택배비">
              <input type="number" value={form.shipping_cost} onChange={(e) => updateForm("shipping_cost", Number(e.target.value))} />
            </Field>
            <Field label="포장비">
              <input type="number" value={form.packaging_cost} onChange={(e) => updateForm("packaging_cost", Number(e.target.value))} />
            </Field>
            <Field label={`권장 최대 매입가: ${currency(recommendedMaxPurchase)}`} full>
              <textarea value={form.note} onChange={(e) => updateForm("note", e.target.value)} placeholder="오염 여부, 특징, 계절감 등을 메모해 두세요." />
            </Field>
          </div>
          <div className="header-actions">
            <button className="primary add-button" onClick={saveItem} disabled={saving || loading}>
              {editingId ? "상품 수정 저장" : "상품 등록하기"}
            </button>
            {editingId && (
              <button className="secondary add-button" onClick={cancelEdit} type="button">
                수정 취소
              </button>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>재고 목록</h2>
            <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="브랜드, 상품명 검색" />
          </div>
          <div className="item-list">
            {loading ? (
              <div className="notice neutral">불러오는 중...</div>
            ) : filteredItems.length === 0 ? (
              <div className="notice neutral">등록된 상품이 아직 없어요.</div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  className={`item-card ${selected?.id === item.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div>
                    <div className="item-sub">{item.brand} · {item.category}</div>
                    <div className="item-title">{item.product_name}</div>
                  </div>
                  <div className="item-price">{currency(profitOf(item))}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      {selected && (
        <section className="panel-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>상품 상세</h2>
              <p>{selected.brand} · {selected.category}</p>
            </div>
            <h3 className="detail-title">{selected.product_name}</h3>
            <div className="detail-grid">
              <InfoBox title="매입가" value={currency(selected.purchase_price)} />
              <InfoBox title="판매가" value={currency(selected.sell_price)} />
              <InfoBox title="사이즈" value={selected.size || "-"} />
              <InfoBox title="상태" value={selected.condition || "-"} />
              <InfoBox title="예상 순이익" value={currency(profitOf(selected))} wide />
            </div>
            <div className="note-box">{selected.note || "메모 없음"}</div>
            <div className="check-list">
              <label><input type="checkbox" checked={selected.shot_done} onChange={(e) => updateField(selected.id, "shot_done", e.target.checked)} /> 촬영 완료</label>
              <label><input type="checkbox" checked={selected.post_done} onChange={(e) => updateField(selected.id, "post_done", e.target.checked)} /> 업로드 완료</label>
              <label><input type="checkbox" checked={selected.sold_done} onChange={(e) => updateField(selected.id, "sold_done", e.target.checked)} /> 판매 완료</label>
            </div>
            <div className="header-actions">
              <button className="secondary full" onClick={() => startEdit(selected)}>상품 수정</button>
              <button className="secondary danger-soft full" onClick={() => deleteItem(selected.id)}>상품 삭제</button>
            </div>
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