import React from "react";

const Table = ({ children, className = "", ...props }) => (
  <div className={`overflow-x-auto rounded-3xl border border-white/10 bg-[#0d0f1a] shadow-xl ${className}`} {...props}>
    <table className="w-full whitespace-nowrap text-left text-sm text-white/80">
      {children}
    </table>
  </div>
);

const TableHeader = ({ children, className = "", ...props }) => (
  <thead className={`bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-white/40 border-b border-white/10 ${className}`} {...props}>
    {children}
  </thead>
);

const TableRow = ({ children, className = "", onClick, ...props }) => (
  <tr onClick={onClick} className={`border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors ${className}`} {...props}>
    {children}
  </tr>
);

const TableHead = ({ children, className = "", ...props }) => (
  <th className={`px-6 py-4 ${className}`} {...props}>
    {children}
  </th>
);

const TableBody = ({ children, className = "", ...props }) => (
  <tbody className={className} {...props}>
    {children}
  </tbody>
);

const TableCell = ({ children, className = "", ...props }) => (
  <td className={`px-6 py-4 ${className}`} {...props}>
    {children}
  </td>
);

export { Table, TableHeader, TableRow, TableHead, TableBody, TableCell };
