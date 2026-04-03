'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Upload, Mail, FileText,
  BarChart2, Settings, Zap
} from 'lucide-react';

const navItems = [
  { section: 'MAIN', items: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/leads', icon: Users, label: 'Leads' },
    { href: '/import', icon: Upload, label: 'Import' },
  ]},
  { section: 'OUTREACH', items: [
    { href: '/campaigns', icon: Mail, label: 'Campaigns' },
    { href: '/templates', icon: FileText, label: 'Templates' },
  ]},
  { section: 'INSIGHTS', items: [
    { href: '/analytics', icon: BarChart2, label: 'Analytics' },
  ]},
  { section: 'CONFIG', items: [
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={18} color="white" />
        </div>
        <span className="sidebar-logo-text">OutreachPro</span>
      </div>

      {navItems.map((section) => (
        <div key={section.section}>
          <div className="sidebar-section-label">{section.section}</div>
          {section.items.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link${active ? ' active' : ''}`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      <div style={{ marginTop: 'auto', padding: '16px 12px 0', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--accent-primary)' }}>OutreachPro</strong> v1.0<br/>
          Cold → Hot Conversion Engine
        </div>
      </div>
    </aside>
  );
}
