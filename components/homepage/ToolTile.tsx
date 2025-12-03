// components/homepage/ToolTile.tsx - Tool tile component for homepage

import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface ToolTileProps {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

export default function ToolTile({
  title,
  description,
  href,
  icon: Icon,
}: ToolTileProps) {
  return (
    <Link
      href={href}
      className="group block p-6 bg-white border-2 border-wsu-border-light rounded-full hover:border-wsu-crimson hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-3 bg-wsu-crimson/10 rounded-full group-hover:bg-wsu-crimson/20 transition-colors">
          <Icon className="w-6 h-6 text-wsu-crimson" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-wsu-text-dark mb-2 group-hover:text-wsu-crimson transition-colors">
            {title}
          </h3>
          <p className="text-sm text-wsu-text-muted">{description}</p>
        </div>
      </div>
    </Link>
  )
}

