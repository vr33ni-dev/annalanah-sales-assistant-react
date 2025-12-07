import { useMe } from "./useAuth";
import { isLovablePreview } from "@/lib/mockData";

export function useAuthEnabled() {
  const { data: me, isLoading } = useMe();
  
  // In Lovable preview, enable queries to use mock data
  const inPreview = isLovablePreview();
  
  return { 
    enabled: inPreview || (!!me && !isLoading), 
    me, 
    meLoading: isLoading,
    useMockData: inPreview && !me,
  };
}
