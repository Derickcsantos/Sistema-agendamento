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
    
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

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

// Rotas para funcionários
app.get('/api/admin/employees', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/employees', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const { data, error } = await supabase
      .from('employees')
      .insert([{ name, email, phone }])
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
    const { name, email, phone } = req.body;
    const { data, error } = await supabase
      .from('employees')
      .update({ name, email, phone })
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
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rota para dados do dashboard
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    // Contar funcionários
    const { count: employeesCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    // Contar categorias
    const { count: categoriesCount } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });

    // Contar serviços
    const { count: servicesCount } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true });

    // Contar agendamentos (apenas confirmados)
    const { count: appointmentsCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed');

    // Buscar agendamentos confirmados agrupados por mês
    const { data: appointmentsData, error } = await supabase
      .from('appointments')
      .select('appointment_date')
      .eq('status', 'confirmed');

    if (error) throw error;

    // Preparar os dados por mês
    const monthlyAppointments = Array(12).fill(0); // Janeiro a Dezembro

    appointmentsData.forEach(item => {
      const month = new Date(item.appointment_date).getMonth(); // 0-11
      monthlyAppointments[month]++;
    });

    res.json({
      totalEmployees: employeesCount || 0,
      totalCategories: categoriesCount || 0,
      totalServices: servicesCount || 0,
      totalAppointments: appointmentsCount || 0,
      monthlyAppointments // <== enviando isso pro frontend
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  startWhatsAppBot();
});