const SUPABASE_URL = 'https://ebyfnbpgskyjedoocqha.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieWZuYnBnc2t5amVkb29jcWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTQ4OTUsImV4cCI6MjA5NTQ3MDg5NX0.ifq0NezBiSxxdHcxyTbSjhtjWHipkM8i1znpWw9kLys';

export const supabase = {
  async from(table) {
    return new SupabaseTable(SUPABASE_URL, SUPABASE_ANON_KEY, table);
  }
};

class SupabaseTable {
  constructor(url, key, table) {
    this.url = url;
    this.key = key;
    this.table = table;
  }

  async _request(method, path, body) {
    const res = await fetch(`${this.url}/rest/v1/${path}`, {
      method,
      headers: {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'return=representation',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase error: ${err}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  }

  async select() {
    return this._request('GET', `${this.table}?select=*`);
  }

  async upsert(data) {
    return this._request('POST', `${this.table}?on_conflict=number`, Array.isArray(data) ? data : [data]);
  }

  async delete(number) {
    return this._request('DELETE', `${this.table}?number=eq.${encodeURIComponent(number)}`);
  }
}
