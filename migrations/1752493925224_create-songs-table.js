/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable("songs", {
    id: {
      type: "VARCHAR(50)",
      primaryKey: true,
    },
    title: {
      type: "VARCHAR(200)",
      notNull: true,
    },
    year: {
      type: "INT8",
      notNull: true,
    },
    genre: {
      type: "VARCHAR(200)",
      notNull: true,
    },
    performer: {
      type: "VARCHAR(200)",
      notNull: true,
    },
    duration: {
      type: "INT8",
      notNull: false,
    },
    album_id: {
      type: "VARCHAR(200)",
      notNull: false,
    },
  });

  pgm.addConstraint(
    "songs",
    "fk_songs.song_album.id",
    "FOREIGN KEY(album_id) REFERENCES albums(id) ON DELETE CASCADE"
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable("songs");
};
