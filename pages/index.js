// index.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

const docList = [
  "Company Profile",
  "ISO Certificate",
  "DPDP Assessment",
  "Cybersecurity Policy",
  "HR Policy",
  "Risk Assessment",
  "Privacy Policy",
  "Incident Response Plan",
  "Vendor Agreements",
  "Consent Forms",
];

export default function Home() {
  const [docs, setDocs] = useState(
    docList.map((name) => ({
      name,
      checked: false,
      file: null,
      fileName: null,
      uploadedId: null,
      status: "No document",
    }))
  );
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [message, setMessage] = useState("");
  const [adminFiles, setAdminFiles] = useState([]);
  const [company, setCompany] = useState({});
  const [allSubmitted, setAllSubmitted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem("company_session");
    if (!session) {
      router.push("/login");
    } else {
      const parsed = JSON.parse(session);
      setCompany(parsed);
    }
  }, []);

  useEffect(() => {
    if (company.username) {
      fetchAdminFiles();
    }
  }, [company]);

  function toggleCheck(idx) {
    setDocs((prev) =>
      prev.map((doc, i) =>
        i === idx
          ? {
              ...doc,
              checked: !doc.checked,
              file: !doc.checked ? doc.file : null,
              status: !doc.checked && doc.fileName ? "Document received" : "No document",
            }
          : doc
      )
    );
    setMessage("");
  }

  async function handleFileChange(e, idx) {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingIndex(idx);
    setMessage("");

    const fileName = `${company.username}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, file);

    if (uploadError) {
      setMessage(`❌ Upload failed for ${docs[idx].name}: ${uploadError.message}`);
    } else {
      const { data: upserted, error } = await supabase
        .from("uploaded_documents")
        .upsert({
          company_username: company.username,
          doc_type: docs[idx].name,
          file_name: fileName,
          uploaded_at: new Date(),
        })
        .select();

      const uploadedId = upserted?.[0]?.id;

      setDocs((prev) =>
        prev.map((doc, i) =>
          i === idx
            ? {
                ...doc,
                file,
                status: "Document received",
                fileName,
                uploadedId,
                checked: true,
              }
            : doc
        )
      );
      setMessage(`✅ Upload successful for ${docs[idx].name}`);
      fetchAdminFiles();
    }

    setUploadingIndex(null);
  }

  async function deleteDocument(idx) {
    const doc = docs[idx];
    if (!doc.fileName) {
      setMessage("❌ No document to delete.");
      return;
    }

    try {
      const { error: storageErr } = await supabase.storage
        .from("documents")
        .remove([doc.fileName]);

      const { error: dbErr } = await supabase
        .from("uploaded_documents")
        .delete()
        .eq("file_name", doc.fileName)
        .eq("company_username", company.username);

      if (storageErr || dbErr) {
        console.error("Delete Errors:", storageErr, dbErr);
        setMessage("❌ Deletion failed.");
        return;
      }

      const updated = docs.map((d, i) =>
        i === idx
          ? {
              ...d,
              checked: false,
              fileName: null,
              uploadedId: null,
              file: null,
              status: "No document",
            }
          : d
      );
      setDocs(updated);
      setMessage(`🗑 Deleted \"${doc.name}\"`);
      fetchAdminFiles();
    } catch (err) {
      console.error("Unexpected deletion error:", err);
      setMessage("❌ Unexpected error occurred during deletion.");
    }
  }

  async function fetchAdminFiles() {
    const { data, error } = await supabase
      .from("uploaded_documents")
      .select("id, file_name, doc_type")
      .eq("company_username", company.username);

    if (!error && data) {
      const urls = await Promise.all(
        data.map(async (file) => {
          const { data: signedUrl } = await supabase.storage
            .from("documents")
            .createSignedUrl(file.file_name, 60 * 60);
          return {
            id: file.id,
            name: file.file_name,
            type: file.doc_type,
            url: signedUrl?.signedUrl,
          };
        })
      );
      setAdminFiles(urls);

      const updatedDocs = docList.map((name) => {
        const match = urls.find((u) => u.type === name);
        return match
          ? {
              name,
              checked: true,
              file: null,
              status: "Document received",
              fileName: match.name,
              uploadedId: match.id,
            }
          : {
              name,
              checked: false,
              file: null,
              status: "No document",
              fileName: null,
              uploadedId: null,
            };
      });

      setDocs(updatedDocs);
      setAllSubmitted(updatedDocs.every((doc) => doc.status === "Document received"));
    }
  }

  // ... rest of the component remains unchanged
