"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function ReportsFilter({ availableYears }: { availableYears: number[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentYear = new Date().getFullYear();
  const selectedYear = searchParams.get("year") 
    ? parseInt(searchParams.get("year") as string, 10) 
    : currentYear;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const year = e.target.value;
      const params = new URLSearchParams(searchParams.toString());
      params.set("year", year);
      
      router.push(`/dashboard/reports?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="year-select" className="text-sm font-medium text-gray-400">
        Ano:
      </label>
      <select
        id="year-select"
        value={selectedYear}
        onChange={handleChange}
        className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
      >
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}
