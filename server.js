require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const { create } = require('@wppconnect-team/wppconnect');
const cookieParser = require('cookie-parser');


const app = express();
const port = process.env.PORT || 3000;

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
app.use(cookieParser());

let whatsappClient = null;


const corsOptions = {
  origin: '*',              // Permite qualquer origem
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Permite os métodos HTTP que você precisa
  allowedHeaders: ['Content-Type'], // Permite esses cabeçalhos específicos
  credentials: true,        // Permite cookies (importante se for necessário)
};

// Middlewares
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


const checkAuth = (req, res, next) => {
  const userData = req.cookies.userData;  // Obtendo os dados do usuário do cookie

  if (!userData) {
    return res.status(403).send('Acesso negado');  // Caso não tenha cookie
  }

  const parsedUser = JSON.parse(userData);

  // Verificando se o tipo do usuário é 'admin'
  if (parsedUser.tipo === 'admin') {
    next();  // Usuário autorizado, segue para a rota do admin
  } else {
    return res.status(403).send('Acesso negado');
  }
};

// Rotas para servir os arquivos HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
// app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin', checkAuth, async (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Rota para a página inicial logada
app.get('/logado', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logado.html'), {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    }
  });
});

// Rota para a página de agendamentos
app.get('/logado/agendamentos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logado.html'), {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    }
  });
});


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Função para gerar senha
function gerarSenha() {
  const letras = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';

  let senha = '';
  for (let i = 0; i < 4; i++) {
    senha += letras.charAt(Math.floor(Math.random() * letras.length));
  }
  for (let i = 0; i < 3; i++) {
    senha += numeros.charAt(Math.floor(Math.random() * numeros.length));
  }

  return senha;
}

// Busca usuário por email
async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, username')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Erro ao buscar usuário por email:', error);
    return null;
  }

  return data;
}

// Atualiza a senha do usuário
async function updateUserPassword(userId, newPassword) {
  const { error } = await supabase
    .from('users')
    .update({ password_plaintext: newPassword })
    .eq('id', userId);

  if (error) {
    throw error;
  }
}


// Rota para recuperação de senha
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Aqui você deve verificar se o email existe no seu banco de dados
    // Esta é uma implementação simulada - substitua pela sua lógica real
    const user = await findUserByEmail(email); // Você precisa implementar esta função
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Email não encontrado' });
    }

    // Gera nova senha
    const newPassword = gerarSenha();
    
    // Atualiza a senha no banco de dados (implemente esta função)
    await updateUserPassword(user.id, newPassword);
    
    // Envia email com a nova senha
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Recuperação de Senha - Salão de Beleza',
      html: `
        <h2>Recuperação de Senha</h2>
        <p>Você solicitou uma nova senha para acessar o sistema do Salão de Beleza.</p>
        <p>Sua nova senha é: <strong>${newPassword}</strong></p>
        <p>Recomendamos que você altere esta senha após o login.</p>
        <p>Caso não tenha solicitado esta alteração, por favor ignore este email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro na recuperação de senha:', error);
    res.status(500).json({ success: false, error: 'Erro ao processar solicitação' });
  }
});

app.post('/api/send-confirmation-email', async (req, res) => {
  try {
    const { email, subject, body } = req.body;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: body
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    res.status(500).json({ error: 'Erro ao enviar e-mail' });
  }
});

// Rota para enviar mensagem via WhatsApp
app.post('/api/send-whatsapp-confirmation', async (req, res) => {
  try {
    const { clientPhone, appointmentDetails } = req.body;

    if (!whatsappClient) {
      return res.status(500).json({ 
        success: false, 
        error: "WhatsApp não conectado. Por favor, reinicie o servidor." 
      });
    }

    // Validação dos dados
    if (!clientPhone || !appointmentDetails) {
      return res.status(400).json({
        success: false,
        error: "Dados incompletos"
      });
    }

    const formattedPhone = `55${clientPhone.replace(/\D/g, '')}@c.us`;
    const message = `📅 *Confirmação de Agendamento* \n\n` +
      `✅ *Serviço:* ${appointmentDetails.service}\n` +
      `👩🏾‍💼 *Profissional:* ${appointmentDetails.professional}\n` +
      `📆 *Data:* ${appointmentDetails.date}\n` +
      `⏰ *Horário:* ${appointmentDetails.time}\n\n` +
      `_Agradecemos sua preferência!_`;

    // Envia a mensagem
    await whatsappClient.sendText(formattedPhone, message);
    
    res.json({ success: true });

  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Falha no envio" 
    });
  }
});

async function startWhatsAppBot() {
  try {
    whatsappClient = await create({
      session: 'salon-bot',
      puppeteerOptions: { 
        headless: true, // Modo invisível
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage'
        ]
      },
      disableWelcome: true,
      catchQR: (base64Qr, asciiQR) => {
        console.log('=== QR Code para conexão ===');
        console.log(asciiQR); // Mostra apenas no terminal
        console.log('===========================');
      },
      logQR: false // Desativa log adicional do QR
    });

    console.log('✅ Bot pronto para conexão via QR Code no terminal!');

  } catch (error) {
    console.error('Erro ao iniciar bot:', error);
    process.exit(1);
  }
}

// Rota para obter todos os usuários
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rota para obter um usuário específico
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rota para criar um novo usuário
app.post('/api/users', async (req, res) => {
  const { username, email, password_plaintext, tipo = 'comum' } = req.body;

  try {
    // Verifica se já existe usuário com mesmo username ou email
    const { data: existingUsers, error: userError } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`);

    if (userError) throw userError;

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        error: 'Usuário ou email já cadastrado'
      });
    }

    // Insere novo usuário
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        username,
        email,
        password_plaintext,
        tipo,
        created_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    if (insertError) throw insertError;

    res.json(newUser);
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para atualizar um usuário
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password_plaintext, tipo } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: 'Nome de usuário e e-mail são obrigatórios' });
    }

    const updateData = {
      username,
      email,
      updated_at: new Date().toISOString(),
      ...(tipo && { tipo }),
      ...(password_plaintext && { password_plaintext })
    };

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rota para excluir um usuário
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se o usuário existe
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (userError || !existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Exclui o usuário
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota de cadastro
app.post('/api/register', async (req, res) => {
  const { username, email, aniversario, password_plaintext } = req.body;

  try {
    // Verifica se já existe usuário com mesmo username ou email
    const { data: existingUsers, error: userError } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`);

    if (userError) {
      throw userError;
    }

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        error: 'Usuário ou email já cadastrado'
      });
    }

    // Insere novo usuário com tipo "comum"
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        username,
        email,
        aniversario,
        password_plaintext, // Em produção: criptografar
        tipo: 'comum',
        created_at: new Date().toISOString()
      }])
      .select('id, username, email, aniversario, created_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    res.json({
      success: true,
      user: newUser
    });

  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});


// ... (o restante do código permanece o mesmo)
// Rota de login simplificada (SEM HASH - APENAS PARA DESENVOLVIMENTO)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, password_plaintext, tipo')
      .eq('username', username)
      .single();

    if (error || !user || user.password_plaintext !== password) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Se a autenticação for bem-sucedida, define o cookie com os dados do usuário
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      tipo: user.tipo
    };

    res.cookie('userData', JSON.stringify(userData), {
      httpOnly: true,   // Evita que o cookie seja acessado via JavaScript
      secure: false,    // Coloque true se estiver usando HTTPS em produção
      maxAge: 60 * 60 * 1000, // Expira após 1 hora
    });

    res.json({
      success: true,
      user: userData
    });

  } catch (err) {
    console.error('Erro ao fazer login:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});


app.post('/api/verifica-usuario', async (req, res) => {
  const { username } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.json({ exists: false });
    }

    res.json({ exists: true });
  } catch (err) {
    console.error('Erro ao verificar usuário:', err);
    res.status(500).json({ exists: false });
  }
});


// API para o frontend (Agendamento)
app.get('/api/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/services/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('category_id', categoryId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/employees/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { data, error } = await supabase
      .from('employee_services')
      .select('employees(*)')
      .eq('service_id', serviceId);

    if (error) throw error;
    const employees = data.map(item => item.employees);
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/available-times', async (req, res) => {
  try {
    const { employeeId, date, duration } = req.query;
    console.log('Parâmetros recebidos:', { employeeId, date, duration });
    
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0-6 (Domingo-Sábado)
    console.log('Dia da semana calculado:', dayOfWeek)

    const { data: schedule, error: scheduleError } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (scheduleError || !schedule || !schedule.is_available) {
      return res.json([]);
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('appointment_date', date)
      .order('start_time', { ascending: true });

    if (appointmentsError) throw appointmentsError;

    const workStart = new Date(`${date}T${schedule.start_time}`);
    const workEnd = new Date(`${date}T${schedule.end_time}`);
    const interval = 15 * 60 * 1000;
    const durationMs = duration * 60 * 1000;
    
    let currentSlot = new Date(workStart);
    const availableSlots = [];

    while (currentSlot.getTime() + durationMs <= workEnd.getTime()) {
      const slotStart = new Date(currentSlot);
      const slotEnd = new Date(slotStart.getTime() + durationMs);
      
      const isAvailable = !appointments.some(appointment => {
        const apptStart = new Date(`${date}T${appointment.start_time}`);
        const apptEnd = new Date(`${date}T${appointment.end_time}`);
        
        return (
          (slotStart >= apptStart && slotStart < apptEnd) ||
          (slotEnd > apptStart && slotEnd <= apptEnd) ||
          (slotStart <= apptStart && slotEnd >= apptEnd)
        );
      });
      
      if (isAvailable) {
        availableSlots.push({
          start: slotStart.toTimeString().substring(0, 5),
          end: slotEnd.toTimeString().substring(0, 5)
        });
      }
      
      currentSlot = new Date(currentSlot.getTime() + interval);
    }

    res.json(availableSlots);
  } catch (error) {
    console.error('Error fetching available times:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { client_name, client_email, client_phone, service_id, employee_id, date, start_time, end_time } = req.body;
    
    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        client_name,
        client_email,
        client_phone,
        service_id,
        employee_id,
        appointment_date: date,
        start_time,
        end_time,
        status: 'confirmed'
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rota para obter agendamentos por email (área do cliente)
app.get('/api/logado/appointments', async (req, res) => {
  try {
    const { email } = req.query;
    
    // Busca os agendamentos do cliente
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        client_name,
        client_email,
        client_phone,
        appointment_date,
        start_time,
        end_time,
        status,
        created_at,
        services(name, price),
        employees(name)
      `)
      .eq('client_email', email)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Formata os dados para resposta
    const formattedData = data.map(item => ({
      id: item.id,
      date: item.appointment_date,
      start_time: item.start_time,
      end_time: item.end_time,
      status: item.status,
      created_at: item.created_at,
      service_name: item.services?.name,
      service_price: item.services?.price,
      professional_name: item.employees?.name,
      client_name: item.client_name,
      client_email: item.client_email,
      client_phone: item.client_phone
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching client appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rotas para agendamentos (admin)
app.get('/api/admin/appointments', async (req, res) => {
  try {
    const { search, date } = req.query;
    let query = supabase
      .from('appointments')
      .select('*, services(name, price), employees(name)')
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (search) {
      query = query.or(`client_name.ilike.%${search}%,client_email.ilike.%${search}%,client_phone.ilike.%${search}%`);
    }

    if (date) {
      query = query.eq('appointment_date', date);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/appointments/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'canceled' })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error canceling appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API para a área administrativa
// Rotas para categorias
app.get('/api/admin/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Categoria não encontrada' });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/categories', async (req, res) => {
  try {
    const { name } = req.body;
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const { data, error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rotas para serviços
app.get('/api/admin/services', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*, categories(name)')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/services', async (req, res) => {
  try {
    const { category_id, name, description, duration, price } = req.body;
    const { data, error } = await supabase
      .from('services')
      .insert([{ category_id, name, description, duration, price }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('services')
      .select('*, categories(name)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Serviço não encontrado' });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, description, duration, price } = req.body;
    const { data, error } = await supabase
      .from('services')
      .update({ category_id, name, description, duration, price })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ROTAS DE FUNCIONÁRIOS
app.get('/api/admin/employees', async (req, res) => {
  try {
    // Buscar funcionários
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (employeesError) throw employeesError;

    // Buscar horários para cada funcionário
    const employeesWithSchedules = await Promise.all(
      employees.map(async employee => {
        const { data: schedules, error: schedulesError } = await supabase
          .from('work_schedules')
          .select('*')
          .eq('employee_id', employee.id);

        if (schedulesError) throw schedulesError;

        return { 
          ...employee, 
          work_schedules: schedules || [] 
        };
      })
    );

    res.json(employeesWithSchedules);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

app.get('/api/admin/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/employees', async (req, res) => {
  try {
    const { name, email, phone, comissao , is_active } = req.body;
    const { data, error } = await supabase
      .from('employees')
      .insert([{ 
        name, 
        email, 
        phone,
        comissao, 
        is_active: is_active !== false 
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, comissao , is_active } = req.body;
    const { data, error } = await supabase
      .from('employees')
      .update({ 
        name, 
        email, 
        phone, 
        comissao,
        is_active 
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primeiro deletar os horários associados
    const { error: scheduleError } = await supabase
      .from('work_schedules')
      .delete()
      .eq('employee_id', id);

    if (scheduleError) throw scheduleError;

    // Depois deletar o funcionário
    const { error: employeeError } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (employeeError) throw employeeError;

    res.status(204).end();
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ROTAS DE HORÁRIOS
app.get("/schedules", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("work_schedules")
      .select("*, employees(name, email)");

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rota para criar/atualizar horários
app.post("/schedules", async (req, res) => {
  try {
    const { employee_id, day_of_week, start_time, end_time, is_available = true } = req.body;

    // Validações
    if (!employee_id || day_of_week === undefined || !start_time || !end_time) {
      return res.status(400).json({ 
        error: 'Dados incompletos',
        details: 'employee_id, day_of_week (número), start_time e end_time são obrigatórios'
      });
    }

    // Converter dia da semana para número se for string
    const dayNumber = convertDayToNumber(day_of_week);
    if (dayNumber === null) {
      return res.status(400).json({ 
        error: 'Dia da semana inválido',
        details: 'Use número (0-6) ou nome do dia (ex: "Segunda-feira")'
      });
    }

    // Formatando os horários para HH:MM:SS
    const formattedStart = formatTimeToHHMMSS(start_time);
    const formattedEnd = formatTimeToHHMMSS(end_time);

    // Inserção no banco
    const { data, error } = await supabase
      .from("work_schedules")
      .insert([{ 
        employee_id, 
        day_of_week: dayNumber, 
        start_time: formattedStart, 
        end_time: formattedEnd, 
        is_available 
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);

  } catch (error) {
    console.error('Erro no servidor:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Funções auxiliares
function convertDayToNumber(day) {
  if (typeof day === 'number') {
    return (day >= 0 && day <= 6) ? day : null;
  }

  const daysMap = {
    'segunda': 0, 'segunda-feira': 0,
    'terça': 1, 'terça-feira': 1,
    'quarta': 2, 'quarta-feira': 2,
    'quinta': 3, 'quinta-feira': 3,
    'sexta': 4, 'sexta-feira': 4,
    'sábado': 5, 'sabado': 5,
    'domingo': 6
  };

  return daysMap[day.toLowerCase()] || null;
}

function formatTimeToHHMMSS(time) {
  if (!time) return '09:00:00'; // Valor padrão
  
  // Se já está no formato HH:MM:SS
  if (typeof time === 'string' && time.match(/^\d{2}:\d{2}:\d{2}$/)) {
    return time;
  }
  
  // Se está no formato HH:MM
  if (typeof time === 'string' && time.match(/^\d{2}:\d{2}$/)) {
    return `${time}:00`;
  }
  
  // Se é um número como 800 (8:00) ou 1700 (17:00)
  if (typeof time === 'number') {
    const timeStr = String(time).padStart(4, '0');
    return `${timeStr.substr(0, 2)}:${timeStr.substr(2, 2)}:00`;
  }
  
  return '09:00:00'; // Valor padrão se não reconhecer
}

// Função auxiliar de validação
function isValidTime(time) {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

app.get("/schedules/:employee_id", async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { data, error } = await supabase
      .from("work_schedules")
      .select("*")
      .eq("employee_id", employee_id);

    if (error) throw error;
    
    // Função para converter número para nome do dia
    const convertNumberToDayName = (dayNumber) => {
      const days = [
        'Segunda-feira', 
        'Terça-feira',
        'Quarta-feira',
        'Quinta-feira',
        'Sexta-feira',
        'Sábado',
        'Domingo'
      ];
      return days[dayNumber] || 'Dia inválido';
    };

    // Formatar os dados antes de retornar
    const formattedData = data.map(schedule => ({
      ...schedule,
      day: convertNumberToDayName(schedule.day_of_week), // Adiciona o nome do dia
      start_time: formatTimeFromDB(schedule.start_time),
      end_time: formatTimeFromDB(schedule.end_time)
    }));
    
    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching employee schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Função auxiliar para formatar o horário do banco de dados
function formatTimeFromDB(time) {
  if (!time) return null;
  
  // Se já estiver no formato HH:MM
  if (typeof time === 'string' && time.includes(':')) return time;
  
  // Se for um número (como 100000 para 10:00:00)
  if (typeof time === 'number') {
    const timeStr = String(time).padStart(6, '0');
    return `${timeStr.substr(0, 2)}:${timeStr.substr(2, 2)}`;
  }
  
  return time;
}

app.delete("/schedules/employees/:employee_id", async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { error } = await supabase
      .from("work_schedules")
      .delete()
      .eq("employee_id", employee_id);

    if (error) throw error;
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting employee schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete("/schedules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("work_schedules")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rota para dados do dashboard
// Rota para dados do dashboard
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    // 1. Contagem básica de funcionários, categorias, serviços e agendamentos
    const [
      { count: employeesCount },
      { count: categoriesCount },
      { count: servicesCount },
      { count: appointmentsCount }
    ] = await Promise.all([
      supabase.from('employees').select('*', { count: 'exact', head: true }),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('services').select('*', { count: 'exact', head: true }),
      supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'confirmed')
    ]);

    // 2. Dados detalhados para os gráficos
    const [
      { data: employeesData, error: employeesError },
      { data: usersData, error: usersError },
      { data: couponsData, error: couponsError },
      { data: appointmentsData, error: appointmentsError }
    ] = await Promise.all([
      supabase.from('employees').select('is_active'),
      supabase.from('users').select('tipo'),
      supabase.from('coupons').select('is_active'),
      supabase.from('appointments').select('appointment_date').eq('status', 'confirmed')
    ]);

    // Verificar erros nas consultas
    if (employeesError || usersError || couponsError || appointmentsError) {
      throw new Error(
        employeesError?.message || 
        usersError?.message || 
        couponsError?.message || 
        appointmentsError?.message
      );
    }

    // 3. Processamento dos dados para os gráficos
    // Funcionários (ativos/inativos)
    const employeesStatus = {
      active: employeesData.filter(e => e.is_active).length,
      inactive: employeesData.filter(e => !e.is_active).length
    };

    // Usuários (admin/comum)
    const usersDistribution = {
      admin: usersData.filter(u => u.tipo === 'admin').length,
      comum: usersData.filter(u => u.tipo === 'comum').length
    };

    // Cupons (ativos/inativos)
    const couponsStatus = {
      active: couponsData.filter(c => c.is_active).length,
      inactive: couponsData.filter(c => !c.is_active).length
    };

    // Agendamentos por mês
    const monthlyAppointments = Array(12).fill(0); // Janeiro a Dezembro
    appointmentsData.forEach(item => {
      const month = new Date(item.appointment_date).getMonth(); // 0-11
      monthlyAppointments[month]++;
    });

    // 4. Retornar todos os dados consolidados
    res.json({
      // Totais básicos
      totalEmployees: employeesCount || 0,
      totalCategories: categoriesCount || 0,
      totalServices: servicesCount || 0,
      totalAppointments: appointmentsCount || 0,
      
      // Dados para gráficos
      monthlyAppointments,
      employeesStatus,
      usersDistribution,
      couponsStatus,
      
      // Metadados
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Rotas de Cupons
app.get('/api/coupons', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/coupons/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/coupons', async (req, res) => {
  try {
    const couponData = {
      ...req.body,
      code: req.body.code.toUpperCase()
    };
    
    const { data, error } = await supabase
      .from('coupons')
      .insert(couponData)
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/coupons/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/coupons/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/validate-coupon', async (req, res) => {
  try {
    const { code, serviceId } = req.query;
    const cleanCode = code.trim().toUpperCase();

    // Busca o serviço
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('price, name')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return res.json({ valid: false, message: 'Serviço não encontrado' });
    }

    // Busca o cupom básico
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      return res.json({ valid: false, message: 'Cupom não encontrado ou inativo' });
    }

    const now = new Date();

    // Valida data de validade
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return res.json({ valid: false, message: 'Este cupom expirou' });
    }

    // Valida número máximo de usos
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      return res.json({ valid: false, message: 'Este cupom atingiu o número máximo de usos' });
    }

    // Valida valor mínimo do serviço
    if (service.price < coupon.min_service_value) {
      return res.json({
        valid: false,
        message: `Este cupom requer serviço com valor mínimo de R$ ${coupon.min_service_value.toFixed(2)}`
      });
    }

    // Cupom válido
    return res.json({
      valid: true,
      discount: coupon.discount_value,
      discountType: coupon.discount_type,
      message: `Cupom aplicado! Desconto de ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : 'R$'}`
    });

  } catch (error) {
    console.error('Erro na validação:', error);
    return res.status(500).json({ valid: false, message: 'Erro interno ao validar cupom' });
  }
});


// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  startWhatsAppBot();
});