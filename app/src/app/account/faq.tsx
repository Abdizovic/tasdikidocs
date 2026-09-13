import { AccountScreenHeader } from '@/components/account/AccountScreenHeader';
import { AccordionItem, Card, ScreenContainer } from '@/components/ui';
import { FAQ_ITEMS } from '@/data/helpContent';

export default function FaqScreen() {
  return (
    <ScreenContainer>
      <AccountScreenHeader title="Frequently Asked Questions" />

      <Card style={{ padding: 0, borderWidth: 0 }}>
        {FAQ_ITEMS.map((item, index) => (
          <AccordionItem key={item.question} title={item.question} isLast={index === FAQ_ITEMS.length - 1}>
            {item.answer}
          </AccordionItem>
        ))}
      </Card>
    </ScreenContainer>
  );
}
