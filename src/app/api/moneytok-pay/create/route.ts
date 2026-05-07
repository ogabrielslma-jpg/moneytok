// API de criacao de conta MoneyTokPay
// POST { full_name, cpf, birth_date, phone, payout_method?, bank_*?, pix_*? }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Validacoes auxiliares
function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  // 11 digitos, nao todos iguais
  return clean.length === 11 && !/^(\d)\1{10}$/.test(clean);
}

function isAdult(birthDate: string): boolean {
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 18;
}

function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, '');
  return clean.length >= 10 && clean.length <= 11;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      full_name,
      cpf,
      birth_date,
      phone,
      payout_method,
      bank_name,
      bank_agency,
      bank_account,
      bank_account_type,
      bank_holder_name,
      bank_holder_doc,
      pix_key,
      pix_key_type,
    } = body;

    // Pega user logado pelo bearer token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }
    const token = authHeader.substring(7);

    // Cliente admin pra ler user
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalido' }, { status: 401 });
    }

    // Validacoes
    if (!full_name || full_name.trim().length < 3) {
      return NextResponse.json({ error: 'Nome completo invalido' }, { status: 400 });
    }
    if (!isValidCPF(cpf || '')) {
      return NextResponse.json({ error: 'CPF invalido' }, { status: 400 });
    }
    if (!isAdult(birth_date)) {
      return NextResponse.json({ error: 'Voce precisa ter 18 anos ou mais' }, { status: 400 });
    }
    if (!isValidPhone(phone || '')) {
      return NextResponse.json({ error: 'Telefone invalido' }, { status: 400 });
    }

    // Se tem payout_method, valida campos
    if (payout_method === 'bank') {
      if (!bank_name || !bank_agency || !bank_account || !bank_account_type) {
        return NextResponse.json({ error: 'Dados bancarios incompletos' }, { status: 400 });
      }
    } else if (payout_method === 'pix') {
      if (!pix_key || !pix_key_type) {
        return NextResponse.json({ error: 'Dados PIX incompletos' }, { status: 400 });
      }
    }

    // Insere
    const { data, error } = await adminClient
      .from('moneytok_pay_accounts')
      .insert({
        user_id: user.id,
        full_name: full_name.trim(),
        cpf: cpf.replace(/\D/g, ''),
        birth_date,
        phone: phone.replace(/\D/g, ''),
        payout_method: payout_method || null,
        bank_name: bank_name || null,
        bank_agency: bank_agency || null,
        bank_account: bank_account || null,
        bank_account_type: bank_account_type || null,
        bank_holder_name: bank_holder_name || null,
        bank_holder_doc: bank_holder_doc?.replace(/\D/g, '') || null,
        pix_key: pix_key || null,
        pix_key_type: pix_key_type || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[moneytok-pay/create] insert error:', error);
      // CPF duplicado
      if (error.code === '23505' && error.message.includes('cpf')) {
        return NextResponse.json({ error: 'Este CPF ja esta cadastrado' }, { status: 409 });
      }
      // User ja tem conta
      if (error.code === '23505' && error.message.includes('user_id')) {
        return NextResponse.json({ error: 'Voce ja tem uma conta MoneyTokPay' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 });
    }

    return NextResponse.json({ success: true, account: data });
  } catch (error) {
    console.error('[moneytok-pay/create] error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
