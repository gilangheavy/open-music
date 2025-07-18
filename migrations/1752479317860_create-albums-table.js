/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.createTable("albums", {
    id: {
      type: "VARCHAR(50)",
      primaryKey: true,
      notNull: true,
    },
    name: {
      type: "VARCHAR(200)",
      notNull: true,
    },
    year: {
      type: "INT8",
      notNull: true,
    },
    cover: {
      type: "VARCHAR(200)",
      notNull: false,
    },
  });

  pgm.createTable("album_likes", {
    id: {
      type: "VARCHAR(50)",
      primaryKey: true,
      notNull: true,
    },
    user_id: {
      type: "VARCHAR(200)",
      notNull: true,
    },
    album_id: {
      type: "VARCHAR(200)",
      notNull: true,
    },
  });

  pgm.sql(
    "INSERT INTO albums(id, name, year) VALUES ('album-default', 'Default Album', 2000)"
  );

  pgm.addConstraint(
    "album_likes",
    "fk_album_likes.album_id_album.id",
    "FOREIGN KEY(album_id) REFERENCES albums(id) ON DELETE CASCADE"
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable("albums");
};
