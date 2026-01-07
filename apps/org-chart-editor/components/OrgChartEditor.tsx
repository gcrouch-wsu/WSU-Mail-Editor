'use client'

export default function OrgChartEditor() {
  // The iframe loads its own scripts, so we don't need to load admin.js here
  return (
    <iframe
      src="/orgchart-admin.html"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
      }}
      title="Org Chart Editor"
    />
  )
}
