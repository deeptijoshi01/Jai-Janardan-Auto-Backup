import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, MessageSquare, Phone, RefreshCw } from "lucide-react";
import { adminFetch } from "../services/adminAuth";
import { API_BASE_URL } from "../config/api";

interface Enquiry {
  _id: string;
  name: string;
  phone: string;
  interest: string;
  message: string;
  status: "New" | "Contacted" | "Interested";
  createdAt: string;
}

const API_URL = `${API_BASE_URL}/enquiries`;

const Enquiries = () => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEnquiries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminFetch(API_URL, { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        enquiries?: Enquiry[];
      } | null;
      if (!response.ok || !data?.success || !Array.isArray(data.enquiries)) {
        throw new Error(data?.message || "Unable to load enquiries.");
      }
      setEnquiries(data.enquiries);
    } catch (loadError) {
      console.error("Enquiries page API error:", loadError);
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load enquiries."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadEnquiries);
  }, [loadEnquiries]);

  return (
    <section className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a27e3d]">
            Customer messages
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[#0f1c30]">Enquiries</h1>
          <p className="mt-2 text-sm text-[#687080]">
            Recent messages submitted through the Jai Janardan Auto contact form.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadEnquiries()}
          disabled={loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e8e1d3] bg-white px-4 text-sm font-semibold text-[#0f1c30] transition hover:border-[#c9a050] disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={18} /> {error}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#e8e1d3] bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-[#687080]">
            <Loader2 size={19} className="animate-spin" /> Loading enquiries…
          </div>
        ) : enquiries.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
            <MessageSquare size={28} className="text-[#a27e3d]" />
            <h2 className="mt-3 font-semibold text-[#0f1c30]">No enquiries yet</h2>
            <p className="mt-1 max-w-sm text-sm text-[#687080]">
              Messages submitted using the contact form will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#f0ece4]">
            {enquiries.map((enquiry) => (
              <li key={enquiry._id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-[#0f1c30]">{enquiry.name}</h2>
                    <p className="mt-1 text-sm text-[#687080]">{enquiry.interest}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    {enquiry.status}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#343b48]">
                  {enquiry.message}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#687080]">
                  <a
                    href={`tel:${enquiry.phone}`}
                    className="inline-flex items-center gap-1.5 font-medium text-[#0f1c30] hover:text-[#a27e3d]"
                  >
                    <Phone size={14} /> {enquiry.phone}
                  </a>
                  <time dateTime={enquiry.createdAt}>
                    {new Date(enquiry.createdAt).toLocaleString("en-IN")}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default Enquiries;
