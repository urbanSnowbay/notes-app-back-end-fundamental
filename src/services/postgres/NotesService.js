const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const { mapDBToModel } = require('../../utils');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class NotesService {
    constructor() {
        this._pool = new Pool();
    }

    // Pertama pada fungsi addNote, tambahkan properti owner pada parameter objek note. Kemudian, sesuaikan kueri dengan menambahkan nilai owner seperti ini:
    async addNote({ 
        title, body, tags, owner, 
    }) {
        const id = nanoid(16);
        const createdAt = new Date().toISOString();
        const updatedAt = createdAt;

        // Selanjutnya buat objek query untuk memasukan notes baru ke database seperti ini.
        const query = {
            text: 'INSERT INTO notes VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            values: [id, title, body, tags, createdAt, updatedAt, owner], 
        };
        // Sekarang, setiap ada catatan yang masuk maka kolom owner akan ikut terisi. Dengan begitu, kita jadi tahu siapa pemilik dari catatan tersebut.

        // Untuk mengeksekusi query yang sudah dibuat, kita gunakan fungsi this._pool.query.
        const result = await this._pool.query(query);

        // Jika nilai id tidak undefined, itu berarti catatan berhasil dimasukan dan kembalikan fungsi dengan nilai id. Jika tidak maka throw InvariantError.
        if (!result.rows[0].id) {
            throw new InvariantError('Catatan gagal ditambahkan');
        }

        return result.rows[0].id;
    }

    // Fungsi getNotes tidak akan mengembalikan seluruh catatan yang disimpan pada tabel notes. Melainkan hanya catatan yang dimiliki oleh owner saja.
    async getNotes(owner) {
        const query = {
            text: 'SELECT * FROM notes WHERE owner = $1',
            values: [owner],
        };
        // Di dalamnya kita dapatkan seluruh data notes yang ada di database dengan query “SELECT * FROM notes”.
        const result = await this._pool.query(query);
        // Kembalikan fungsi getNotes dengan nilai result.rows yang telah di mapping dengan fungsi mapDBToModel.
        return result.rows.map(mapDBToModel);
    }

    // Untuk proses pengecekan apakah catatan dengan ID yang diminta adalah hak pengguna, menggunakan fungsi baru yaitu verifyNoteOwner. Fungsi tersebut nantinya akan digunakan pada NotesHandler sebelum mendapatkan, mengubah, dan menghapus catatan berdasarkan id.
    async verifyNoteOwner(id, owner) {
        // Kemudian di dalamnya, lakukan kueri untuk mendapatkan objek note sesuai id;
        const query = {
            text: 'SELECT * FROM notes WHERE id = $1',
            values: [id],
        };
        const result = await this._pool.query(query);

        // bila objek note tidak ditemukkan, maka throw NotFoundError
        if (!result.rows.length) {
            throw new NotFoundError('Catatan tidak ditemukan');
        }

        // bila ditemukan, lakukan pengecekan kesesuaian owner-nya;  bila owner tidak sesuai, maka throw AuthorizationError.
        const note = result.rows[0];
        if (note.owner !== owner) {
            throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
        }
    }

    async getNoteById(id) {
        const query = {
            text: 'SELECT * FROM notes WHERE id = $1',
            values: [id],
        };
        const result = await this._pool.query(query);

        // Kemudian periksa nilai result.rows, bila nilainya 0 (false) maka bangkitkan NotFoundError
        if (!result.rows.length) {
            throw new NotFoundError('Catatan tidak ditemukan');
        }

        // Bila tidak, maka kembalikan dengan result.rows[0] yang sudah di-mapping dengan fungsi mapDBToModel.
        return result.rows.map(mapDBToModel)[0];
    }

    async editNoteById(id, { title, body, tags }) {
        // lakukan query untuk mengubah note di dalam database berdasarkan id yang diberikan.
        const updatedAt = new Date().toISOString();
        const query = {
            text: 'UPDATE notes SET title = $1, body = $2, tags = $3, updated_at = $4 WHERE id = $5 RETURNING id',
            values: [title, body, tags, updatedAt, id],
        };

        const result = await this._pool.query(query);

        // periksa nilai result.rows bila nilainya 0 (false) maka bangkitkan NotFoundError.
        if (!result.rows.length) {
            throw new NotFoundError('Gagal memperbarui catatan. Id tidak ditemukan');
        } 
    }

    async deleteNoteById(id) {
        // Lakukan query untuk menghapus note di dalam database berdasarkan id yang diberikan.
        const query = {
            text: 'DELETE FROM notes WHERE id = $1 RETURNING id',
            values: [id],
        };

        const result = await this._pool.query(query);

        // periksa nilai result.rows bila nilainya 0 (false) maka bangkitkan NotFoundError. 
        if (!result.rows.length) {
            throw new NotFoundError('Catatan gagal dihapus. Id tidak ditemukan');
        }
    }
}

module.exports = NotesService;