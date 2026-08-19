import { type Request, type Response, type NextFunction } from 'express';
import { HomeNews } from '../models/HomeNews.js';
import { HomeService } from '../models/HomeService.js';
import { Enquiry } from '../models/Enquiry.js';
import { AppError } from '../middleware/error.js';

/** GET /api/home/news — public latest news */
export async function getNews(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const news = await HomeNews.find({ active: true }).sort({ createdAt: -1 }).limit(20).lean();
    res.json({ news });
  } catch (err) {
    next(err);
  }
}

/** GET /api/home/services — public active services */
export async function getServices(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const services = await HomeService.find({ active: true }).sort({ createdAt: -1 }).lean();
    res.json({ services });
  } catch (err) {
    next(err);
  }
}

/** GET /api/home/stats — public homepage stats */
export async function getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({
      stats: {
        nodesOnWatch: 10,
        hectaresCovered: '4,200',
        medianAlertTime: '8s',
        uptime: '99.4%',
        recentAlerts: 142,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/home/enquiry — public contact/service enquiry */
export async function createEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, phone, service, message } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      service?: string;
      message?: string;
    };

    if (!name || !email || !phone || !service) {
      throw new AppError('Name, email, phone and service are required.', 400);
    }

    const enquiry = await Enquiry.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      service: String(service).trim(),
      message: message ? String(message).trim() : undefined,
    });

    res.status(201).json({
      message: 'Enquiry submitted successfully. We will contact you shortly.',
      enquiry: {
        id: enquiry._id,
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone,
        service: enquiry.service,
        message: enquiry.message,
        status: enquiry.status,
        createdAt: enquiry.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/home/enquiries — admin: list all enquiries */
export async function listEnquiries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [enquiries, total] = await Promise.all([
      Enquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Enquiry.countDocuments(filter),
    ]);

    res.json({
      enquiries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/home/enquiries/:id/status — admin: update enquiry status */
export async function updateEnquiryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body as { status?: string };

    if (!status || !['new', 'contacted', 'converted', 'closed'].includes(status)) {
      throw new AppError("status must be one of: new, contacted, converted, closed", 400);
    }

    const enquiry = await Enquiry.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!enquiry) {
      throw new AppError('Enquiry not found', 404);
    }

    res.json({ enquiry });
  } catch (err) {
    next(err);
  }
}
