import { AccountMenuSection } from '@/components/account/AccountMenuSection';
import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { AccordionItem, Card, ScreenContainer } from '@/components/ui';
import { DOC_SECTIONS } from '@/data/helpContent';
import { useMemo } from 'react';

export default function DocumentationScreen() {
  const categories = useMemo(() => {
    const map = new Map<string, typeof DOC_SECTIONS>();
    for (const section of DOC_SECTIONS) {
      const existing = map.get(section.category) ?? [];
      existing.push(section);
      map.set(section.category, existing);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <ScreenContainer>
      <AccountScreenHeader title="Documentation" description="How TasdikiDocs works, for every account type." />

      {categories.map(([category, sections]) => (
        <AccountMenuSection key={category} title={category}>
          <Card style={{ padding: 0, borderWidth: 0 }}>
            {sections.map((section, index) => (
              <AccordionItem key={section.title} title={section.title} isLast={index === sections.length - 1}>
                {section.body}
              </AccordionItem>
            ))}
          </Card>
        </AccountMenuSection>
      ))}
    </ScreenContainer>
  );
}
