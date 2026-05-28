import { useTheme } from '../context/ThemeContext';
import darkLogo from '../assets/dark-logo.png';
import whiteLogo from '../assets/white-logo.png';

export default function useLogo() {
  const { isDark } = useTheme();
  return isDark ? whiteLogo : darkLogo;
}
