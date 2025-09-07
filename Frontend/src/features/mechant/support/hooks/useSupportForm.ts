// src/features/support/hooks/useSupportForm.ts
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/shared/errors";
import {
  adminContactSchema,
  ContactTopic,
  type AdminContactPayload,
  type ContactResponse,
} from "../types";
import { submitSupportTicket } from "../api";

export const useSupportForm = () => {
  const { user } = useAuth();
  const { handleError } = useErrorHandler();

  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResponse, setSubmissionResponse] =
    useState<ContactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AdminContactPayload>({
    resolver: zodResolver(adminContactSchema),
    defaultValues: {
      name: (user as any)?.name || "",
      email: user?.email || "",
      phone: "",
      merchantId: user?.merchantId || "",
      topic: ContactTopic.SUPPORT,
      urgency: "normal",
      subject: "",
      message: "",
      website: "", // Honeypot
    },
    mode: "onBlur",
  });

  // تحديث القيم الافتراضية عند تغير بيانات المستخدم المسجل
  useEffect(() => {
    form.reset({
      ...form.getValues(),
      name: (user as any)?.name || "",
      email: user?.email || "",
      merchantId: user?.merchantId || "",
    });
  }, [user, form.reset]);

  const onSubmit = async (values: AdminContactPayload) => {
    setSubmitting(true);
    setError(null);
    setSubmissionResponse(null);

    try {
      if (values.website) throw new Error("Spam detected"); // Honeypot check

      const response = await submitSupportTicket(values, files);
      setSubmissionResponse(response);

      // حفظ التذكرة في Local Storage
      const key = `kaleem:lastTickets:${values.merchantId}`;
      const recentTickets = JSON.parse(localStorage.getItem(key) || "[]");
      recentTickets.unshift({
        ticketNumber: response.ticketNumber,
        createdAt: response.createdAt,
      });
      localStorage.setItem(key, JSON.stringify(recentTickets.slice(0, 5)));

      form.reset();
      setFiles(null);
    } catch (err) {
      const errorMessage = (err as Error).message || "حدث خطأ غير متوقع.";
      setError(errorMessage);
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    files,
    setFiles,
    submitting,
    submissionResponse,
    error,
    onSubmit,
  };
};
