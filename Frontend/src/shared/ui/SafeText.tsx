
import { safeText } from '../utils/text';

export default function SafeText({ value }: { value: unknown }) {
  return <>{safeText(value)}</>;
}
