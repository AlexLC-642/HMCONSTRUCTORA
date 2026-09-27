"use client";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
export function PublicInquirySubmit() {
	const { pending } = useFormStatus();
	return (
		<button
			className="hm-btn hm-btn--primary hm-btn--lg hm-form__submit"
			type="submit"
			disabled={pending}
		>
			{pending ? "Enviando mensaje…" : "Enviar mensaje"}
			{pending ? (
				<LoaderCircle
					className="hm-submit-spinner"
					aria-hidden="true"
					size={20}
				/>
			) : (
				<ArrowUpRight aria-hidden="true" size={20} />
			)}
		</button>
	);
}
