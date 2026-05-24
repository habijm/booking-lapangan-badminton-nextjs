'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Membership, MembershipPlan } from '@/types/booking';

export function useMemberships() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('memberships')
      .select(`*, plan:membership_plans(*), schedules:membership_schedules(*, court:courts(id,name))`)
      .order('created_at', { ascending: false });
    setMemberships((data || []) as Membership[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const sub = supabase.channel('memberships-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'membership_schedules' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [fetch]);

  return { memberships, loading, refetch: fetch };
}

export function useMembershipPlans() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('membership_plans').select('*').order('sessions_per_week')
      .then(({ data }) => { setPlans((data || []) as MembershipPlan[]); setLoading(false); });
  }, []);

  return { plans, loading };
}
